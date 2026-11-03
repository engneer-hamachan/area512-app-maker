require 'rng'
require 'machine'
require 'io/console'
require 'area512-sprite'
require 'area512-sdfat'
require 'area512-widget'

# Constants live under the class so they never collide with other apps in the
# shared sandbox VM, and the guards keep re-runs of this app quiet.
class SnakeGame
  CELL_SIZE = 6 unless const_defined?(:CELL_SIZE)
  COLUMN_COUNT = 39 unless const_defined?(:COLUMN_COUNT)
  ROW_COUNT = 19 unless const_defined?(:ROW_COUNT)
  BOARD_LEFT = 3 unless const_defined?(:BOARD_LEFT)
  BOARD_TOP = 15 unless const_defined?(:BOARD_TOP)
  HEADER_HEIGHT = 13 unless const_defined?(:HEADER_HEIGHT)
  FONT_SIZE = 12 unless const_defined?(:FONT_SIZE)

  START_LENGTH = 4 unless const_defined?(:START_LENGTH)
  START_STEP_MILLISECONDS = 180 unless const_defined?(:START_STEP_MILLISECONDS)
  FASTEST_STEP_MILLISECONDS = 70 unless const_defined?(:FASTEST_STEP_MILLISECONDS)
  SPEED_UP_MILLISECONDS = 6 unless const_defined?(:SPEED_UP_MILLISECONDS)
  POLL_MILLISECONDS = 5 unless const_defined?(:POLL_MILLISECONDS)

  HIGH_SCORE_PATH = "/data/snake.txt" unless const_defined?(:HIGH_SCORE_PATH)

  COLOR_BACKGROUND = Widget.theme_background unless const_defined?(:COLOR_BACKGROUND)
  COLOR_BORDER = Widget.theme_border unless const_defined?(:COLOR_BORDER)
  COLOR_TEXT = Widget.theme_text unless const_defined?(:COLOR_TEXT)
  COLOR_SNAKE = Widget.theme_selected unless const_defined?(:COLOR_SNAKE)
  COLOR_FOOD = Widget.theme_emphasis unless const_defined?(:COLOR_FOOD)
end
