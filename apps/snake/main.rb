class SnakeGame
  def run_loop
    next_step_at = Machine.board_millis

    until @is_quit_requested
      key = read_key
      handle_key(key) if key

      if Machine.board_millis >= next_step_at
        step
        draw
        next_step_at = Machine.board_millis + @step_milliseconds
      end

      sleep_ms(POLL_MILLISECONDS)
    end
  end

  def run
    load_high_score
    start_game
    Display.fill_screen(COLOR_BACKGROUND)
    @sprite = BandedSprite.new(FONT_SIZE)
    STDIN.raw!

    begin
      run_loop
    ensure
      STDIN.cooked!
      @sprite.delete
      Display.fill_screen(COLOR_BACKGROUND)
    end
  end
end

SnakeGame.new.run
