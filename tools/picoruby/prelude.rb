# Loaded before an app's files in a logic test. The libraries that exist on
# this machine are loaded for real; the device's screen, keyboard, card and
# pins are stand-ins whose every method does nothing and returns nil, so that
# an app's files load and its rules run without them.
require 'rng'

class Object
  def require(name)
    true
  end
end

class LogicTestStandIn
  def initialize(*args); end
  def method_missing(name, *args)
    nil
  end
  def self.method_missing(name, *args)
    nil
  end
end

class Display < LogicTestStandIn; end
class Sprite < LogicTestStandIn; end
class BandedSprite < LogicTestStandIn; end
class QuaternarySprite < LogicTestStandIn; end
class Widget < LogicTestStandIn; end
class WidgetList < LogicTestStandIn; end
class WidgetTextView < LogicTestStandIn; end
class Dot < LogicTestStandIn; end
class SD < LogicTestStandIn; end
class Area512 < LogicTestStandIn; end
class Touch < LogicTestStandIn; end
class GPIO < LogicTestStandIn; end
class I2C < LogicTestStandIn; end
class SPI < LogicTestStandIn; end
class ADC < LogicTestStandIn; end
