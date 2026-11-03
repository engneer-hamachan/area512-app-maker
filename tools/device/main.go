// area512-send copies an app folder to a Cardputer over USB, using the protocol of
// components/area512_hal/usb/area512_usb_receive.c.
package main

import (
	"bytes"
	"errors"
	"flag"
	"fmt"
	"hash/crc32"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"go.bug.st/serial"
)

const (
	deviceAppsPath      = "/home/apps"
	replyPrefix         = "AREA512 "
	readyReplyLine      = replyPrefix + "READY"
	okReply             = "OK"
	chunkByteCount      = 4096
	readBufferByteCount = 256
	serialBaudRate      = 115200
	readPollTimeout     = 100 * time.Millisecond
	replyTimeout        = 5 * time.Second
	alreadyReceiveWait  = 1500 * time.Millisecond
	startReceiveWait    = 5 * time.Second
	// Esc then r is the filer's receive key. Sent while the device is already
	// receiving, it would prefix the next command, so check for READY first.
	startReceiveKeys = "\x1br"
)

var devicePortPatterns = map[string]*regexp.Regexp{
	"linux":   regexp.MustCompile(`^/dev/ttyACM\d+$`),
	"darwin":  regexp.MustCompile(`^/dev/cu\.usbmodem`),
	"windows": regexp.MustCompile(`^COM\d+$`),
}

type deviceConnection struct {
	port         serial.Port
	pendingBytes []byte
}

func findDevicePort() (string, error) {
	portNames, err := serial.GetPortsList()
	if err != nil {
		return "", err
	}

	var devicePorts []string

	for _, portName := range portNames {
		if devicePortPatterns[runtime.GOOS].MatchString(portName) {
			devicePorts = append(devicePorts, portName)
		}
	}

	switch len(devicePorts) {
	case 0:
		return "", errors.New("no Cardputer found: connect it by USB")
	case 1:
		return devicePorts[0], nil
	default:
		return "", fmt.Errorf(
			"several serial ports, choose one with --port: %s",
			strings.Join(devicePorts, " "),
		)
	}
}

func openDevice(portName string) (*deviceConnection, error) {
	port, err := serial.Open(portName, &serial.Mode{BaudRate: serialBaudRate})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", portName, err)
	}

	if err := port.SetReadTimeout(readPollTimeout); err != nil {
		port.Close()
		return nil, err
	}

	return &deviceConnection{port: port}, nil
}

// readLine returns the next line, or "" and false when the deadline passes.
func (device *deviceConnection) readLine(deadline time.Time) (string, bool) {
	readBuffer := make([]byte, readBufferByteCount)

	for {
		lineEnd := bytes.IndexByte(device.pendingBytes, '\n')

		if lineEnd >= 0 {
			line := string(device.pendingBytes[:lineEnd])
			device.pendingBytes = device.pendingBytes[lineEnd+1:]

			return strings.TrimRight(line, "\r"), true
		}

		if !time.Now().Before(deadline) {
			return "", false
		}

		readByteCount, err := device.port.Read(readBuffer)
		if err != nil {
			return "", false
		}

		device.pendingBytes = append(device.pendingBytes, readBuffer[:readByteCount]...)
	}
}

func (device *deviceConnection) waitForReady(waitTime time.Duration) bool {
	deadline := time.Now().Add(waitTime)

	for {
		line, received := device.readLine(deadline)

		if !received {
			return false
		}

		if line == readyReplyLine {
			return true
		}
	}
}

func (device *deviceConnection) startReceiving() error {
	if device.waitForReady(alreadyReceiveWait) {
		return nil
	}

	if _, err := device.port.Write([]byte(startReceiveKeys)); err != nil {
		return err
	}

	if !device.waitForReady(startReceiveWait) {
		return errors.New("the Cardputer did not start receiving: show its file list and try again")
	}

	return nil
}

func (device *deviceConnection) expectOk(devicePath string) error {
	deadline := time.Now().Add(replyTimeout)

	for {
		line, received := device.readLine(deadline)

		if !received {
			return fmt.Errorf("%s: no reply from the Cardputer", devicePath)
		}

		if !strings.HasPrefix(line, replyPrefix) || line == readyReplyLine {
			continue
		}

		if reply := strings.TrimPrefix(line, replyPrefix); reply != okReply {
			return fmt.Errorf("%s: %s", devicePath, reply)
		}

		return nil
	}
}

func (device *deviceConnection) sendCommand(devicePath string, command string, payload []byte) error {
	if _, err := device.port.Write(append([]byte(command+"\n"), payload...)); err != nil {
		return err
	}

	return device.expectOk(devicePath)
}

func (device *deviceConnection) sendFile(localPath string, devicePath string) error {
	fileBytes, err := os.ReadFile(localPath)
	if err != nil {
		return err
	}

	fileCommand := fmt.Sprintf(
		"FILE %s %d %08x",
		devicePath,
		len(fileBytes),
		crc32.ChecksumIEEE(fileBytes),
	)

	if err := device.sendCommand(devicePath, fileCommand, nil); err != nil {
		return err
	}

	for offset := 0; offset < len(fileBytes); offset += chunkByteCount {
		chunkEnd := min(offset+chunkByteCount, len(fileBytes))
		chunk := fileBytes[offset:chunkEnd]
		chunkCommand := fmt.Sprintf("DATA %d", len(chunk))

		if err := device.sendCommand(devicePath, chunkCommand, chunk); err != nil {
			return err
		}
	}

	return device.sendCommand(devicePath, "END", nil)
}

func (device *deviceConnection) sendFolder(localPath string, devicePath string) error {
	if err := device.sendCommand(devicePath, "MKDIR "+devicePath, nil); err != nil {
		return err
	}

	entries, err := os.ReadDir(localPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		localEntryPath := filepath.Join(localPath, entry.Name())
		deviceEntryPath := path.Join(devicePath, entry.Name())

		if entry.IsDir() {
			err = device.sendFolder(localEntryPath, deviceEntryPath)
		} else {
			err = device.sendFile(localEntryPath, deviceEntryPath)
		}

		if err != nil {
			return err
		}
	}

	return nil
}

func send(appPath string, portName string) error {
	if portName == "" {
		foundPortName, err := findDevicePort()
		if err != nil {
			return err
		}

		portName = foundPortName
	}

	device, err := openDevice(portName)
	if err != nil {
		return err
	}
	defer device.port.Close()

	if err := device.startReceiving(); err != nil {
		return err
	}

	appDevicePath := path.Join(deviceAppsPath, filepath.Base(filepath.Clean(appPath)))

	if err := device.sendFolder(appPath, appDevicePath); err != nil {
		return err
	}

	if err := device.sendCommand("DONE", "DONE", nil); err != nil {
		return err
	}

	fmt.Println("sent to", appDevicePath)

	return nil
}

func main() {
	portName := flag.String("port", "", "serial port, when more than one is connected")
	flag.Parse()

	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: area512-send [--port PORT] APP_FOLDER")
		os.Exit(2)
	}

	if err := send(flag.Arg(0), *portName); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
