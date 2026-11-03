class SnakeGame
  def load_high_score
    @high_score = 0

    return unless SD.exist?(HIGH_SCORE_PATH)

    @high_score = SD.read(HIGH_SCORE_PATH).to_i
  end

  def save_high_score
    @high_score = @score
    SD.write(HIGH_SCORE_PATH, "#{@high_score}\n")
  end
end
