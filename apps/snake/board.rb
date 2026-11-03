class SnakeGame
  def cell_at(column, row)
    row * COLUMN_COUNT + column
  end

  def start_game
    middle_row = ROW_COUNT / 2
    middle_column = COLUMN_COUNT / 2

    @snake_cells = []

    START_LENGTH.times do |length_index|
      @snake_cells.push(cell_at(middle_column - length_index, middle_row))
    end

    @direction_x = 1
    @direction_y = 0
    @pending_direction = nil
    @score = 0
    @is_game_over = false
    @step_milliseconds = START_STEP_MILLISECONDS
    place_food
  end

  def place_food
    loop do
      column = RNG.random_int.abs % COLUMN_COUNT
      row = RNG.random_int.abs % ROW_COUNT

      @food_cell = cell_at(column, row)

      break unless @snake_cells.include?(@food_cell)
    end
  end

  # Reversing onto the snake's own neck is ignored, as a real turn cannot do it.
  def turn(direction)
    return if direction[0] == -@direction_x && direction[1] == -@direction_y

    @pending_direction = direction
  end

  def apply_pending_direction
    return unless @pending_direction

    @direction_x = @pending_direction[0]
    @direction_y = @pending_direction[1]
    @pending_direction = nil
  end

  def next_head_cell
    head_cell = @snake_cells[0]
    next_column = head_cell % COLUMN_COUNT + @direction_x
    next_row = head_cell / COLUMN_COUNT + @direction_y

    return nil if next_column < 0 || next_column >= COLUMN_COUNT
    return nil if next_row < 0 || next_row >= ROW_COUNT

    cell_at(next_column, next_row)
  end

  def eat_food
    @score += 1
    @step_milliseconds -= SPEED_UP_MILLISECONDS

    if @step_milliseconds < FASTEST_STEP_MILLISECONDS
      @step_milliseconds = FASTEST_STEP_MILLISECONDS
    end

    save_high_score if @score > @high_score
    place_food
  end

  # The tail leaves its cell in the same step, so the head may enter it.
  def step
    return if @is_game_over

    apply_pending_direction

    head_cell = next_head_cell
    is_eating = head_cell == @food_cell

    tail_cell = @snake_cells.pop unless is_eating

    if head_cell.nil? || @snake_cells.include?(head_cell)
      @snake_cells.push(tail_cell) if tail_cell
      @is_game_over = true
      return
    end

    @snake_cells.unshift(head_cell)

    eat_food if is_eating
  end
end
