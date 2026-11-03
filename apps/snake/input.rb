class SnakeGame
  ESCAPE_KEY = "\e" unless const_defined?(:ESCAPE_KEY)

  # The arrow keys arrive as ESC [ A..D when Fn is held, and as ; . , / without it.
  def read_key
    key = STDIN.read_nonblock(1)

    return nil if key.nil? || key.empty?
    return key unless key == ESCAPE_KEY

    sequence = STDIN.read_nonblock(2)

    return key if sequence.nil?

    sequence[1]
  end

  def direction_for_key(key)
    case key
    when "k", "w", ";", "A"
      [0, -1]
    when "j", "s", ".", "B"
      [0, 1]
    when "h", "a", ",", "D"
      [-1, 0]
    when "l", "d", "/", "C"
      [1, 0]
    end
  end

  def handle_key(key)
    case key
    when "q"
      @is_quit_requested = true
    when "r"
      start_game
    else
      direction = direction_for_key(key)
      turn(direction) if direction
    end
  end
end
