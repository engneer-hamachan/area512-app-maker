class SnakeGame
  def draw_cell(cell, color)
    left = BOARD_LEFT + cell % COLUMN_COUNT * CELL_SIZE
    top = BOARD_TOP + cell / COLUMN_COUNT * CELL_SIZE

    @sprite.fill_rect(left, top, CELL_SIZE - 1, CELL_SIZE - 1, color)
  end

  def draw_header
    @sprite.text(4, 0, "SNAKE", COLOR_FOOD)
    @sprite.text(70, 0, "SCORE #{@score}", COLOR_TEXT)
    @sprite.text(150, 0, "BEST #{@high_score}", COLOR_TEXT)
    @sprite.line(0, HEADER_HEIGHT, Display.width - 1, HEADER_HEIGHT, COLOR_BORDER)
  end

  def draw_board_frame
    @sprite.rect(
      BOARD_LEFT - 1,
      BOARD_TOP - 1,
      COLUMN_COUNT * CELL_SIZE + 1,
      ROW_COUNT * CELL_SIZE + 1,
      COLOR_BORDER
    )
  end

  def draw_game_over
    Widget.panel(@sprite, 60, 46, 120, 42)
    Widget.text_center(@sprite, 50, "GAME OVER", COLOR_FOOD)
    Widget.text_center(@sprite, 66, "r retry  q quit", COLOR_TEXT)
  end

  def render
    @sprite.fill(COLOR_BACKGROUND)

    draw_header
    draw_board_frame
    draw_cell(@food_cell, COLOR_FOOD)

    @snake_cells.each { |cell| draw_cell(cell, COLOR_SNAKE) }

    draw_game_over if @is_game_over
  end

  def draw
    while @sprite.draw
      render
    end
  end
end
