// area512-send copies an app folder to a Cardputer or an ESP32-2432S028 over USB,
// using the protocol of components/area512_hal/usb/area512_usb_receive.c.
//
// The Cardputer receives on the ESP32-S3's own USB serial port. The 2432S028
// receives on its UART console through the CH340 USB serial chip, which
// tool/usb_send.py of area512 opens at 115200 baud with RTS and DTR lowered.
package main

import (
	"bytes"
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
	readyWait           = 5 * time.Second
)

type board struct {
	deviceName string
	// Serial port names of the board, by runtime.GOOS.
	portPatterns map[string]*regexp.Regexp
	// The CH340's DTR and RTS reset the ESP32 or hold it in its bootloader.
	isResetSignalLoweredAfterOpen bool
	receiveInstructions           string
}

const defaultBoardName = "cardputer"

var boards = map[string]board{
	"cardputer": {
		deviceName: "Cardputer",
		portPatterns: map[string]*regexp.Regexp{
			"linux":   regexp.MustCompile(`^/dev/ttyACM\d+$`),
			"darwin":  regexp.MustCompile(`^/dev/cu\.usbmodem`),
			"windows": regexp.MustCompile(`^COM\d+$`),
		},
		isResetSignalLoweredAfterOpen: false,
		receiveInstructions:           "press t in its file list, type recv, press Enter and try again",
	},
	"2432s028": {
		deviceName: "2432S028",
		portPatterns: map[string]*regexp.Regexp{
			"linux":   regexp.MustCompile(`^/dev/ttyUSB\d+$`),
			"darwin":  regexp.MustCompile(`^/dev/cu\.(usbserial|wchusbserial)`),
			"windows": regexp.MustCompile(`^COM\d+$`),
		},
		isResetSignalLoweredAfterOpen: true,
		receiveInstructions:           "tap TRM in its file list, type recv, tap Enter and try again",
	},
}

type deviceConnection struct {
	port         serial.Port
	pendingBytes []byte
	deviceName   string
}

func findDevicePort(targetBoard board) (string, error) {
	portNames, err := serial.GetPortsList()
	if err != nil {
		return "", err
	}

	var devicePorts []string

	for _, portName := range portNames {
		if targetBoard.portPatterns[runtime.GOOS].MatchString(portName) {
			devicePorts = append(devicePorts, portName)
		}
	}

	switch len(devicePorts) {
	case 0:
		return "", fmt.Errorf("no %s found: connect it by USB", targetBoard.deviceName)
	case 1:
		return devicePorts[0], nil
	default:
		return "", fmt.Errorf(
			"several serial ports, choose one with --port: %s",
			strings.Join(devicePorts, " "),
		)
	}
}

func openDevice(portName string, targetBoard board) (*deviceConnection, error) {
	port, err := serial.Open(portName, &serial.Mode{BaudRate: serialBaudRate})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", portName, err)
	}

	if targetBoard.isResetSignalLoweredAfterOpen {
		if err := lowerResetSignals(port); err != nil {
			port.Close()
			return nil, fmt.Errorf("%s: %w", portName, err)
		}
	}

	if err := port.SetReadTimeout(readPollTimeout); err != nil {
		port.Close()
		return nil, err
	}

	return &deviceConnection{port: port, deviceName: targetBoard.deviceName}, nil
}

// lowerResetSignals lowers RTS, then DTR, as tool/usb_send.py does.
func lowerResetSignals(port serial.Port) error {
	if err := port.SetRTS(false); err != nil {
		return err
	}

	return port.SetDTR(false)
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

// waitForReady first discards bytes left from before the port was opened, as
// tool/usb_send.py does: a line cut short there would join the next reply.
func (device *deviceConnection) waitForReady(waitTime time.Duration) bool {
	if err := device.port.ResetInputBuffer(); err != nil {
		return false
	}

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

func (device *deviceConnection) expectOk(devicePath string) error {
	deadline := time.Now().Add(replyTimeout)

	for {
		line, received := device.readLine(deadline)

		if !received {
			return fmt.Errorf("%s: no reply from the %s", devicePath, device.deviceName)
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

func send(appPath string, portName string, targetBoard board) error {
	if portName == "" {
		foundPortName, err := findDevicePort(targetBoard)
		if err != nil {
			return err
		}

		portName = foundPortName
	}

	device, err := openDevice(portName, targetBoard)
	if err != nil {
		return err
	}
	defer device.port.Close()

	if !device.waitForReady(readyWait) {
		return fmt.Errorf(
			"the %s is not receiving: %s",
			targetBoard.deviceName,
			targetBoard.receiveInstructions,
		)
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
	boardName := flag.String("board", defaultBoardName, "the device: cardputer or 2432s028")
	flag.Parse()

	targetBoard, isKnownBoard := boards[*boardName]

	if flag.NArg() != 1 || !isKnownBoard {
		fmt.Fprintln(os.Stderr, "usage: area512-send [--board cardputer|2432s028] [--port PORT] APP_FOLDER")
		os.Exit(2)
	}

	if err := send(flag.Arg(0), *portName, targetBoard); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
