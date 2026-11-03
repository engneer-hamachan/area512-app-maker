// Defines the symbols that target_add_binary_data gives area512_seed.c.
__asm__(
  ".section .rodata.area512_seed,\"\",@\n"
  ".globl _binary_area512_seed_tar_start\n"
  ".globl _binary_area512_seed_tar_end\n"
  ".type _binary_area512_seed_tar_start,@object\n"
  ".type _binary_area512_seed_tar_end,@object\n"
  "_binary_area512_seed_tar_start:\n"
  ".incbin \"" AREA512_SEED_TAR_PATH "\"\n"
  ".size _binary_area512_seed_tar_start, . - _binary_area512_seed_tar_start\n"
  "_binary_area512_seed_tar_end:\n"
  ".byte 0\n"
  ".size _binary_area512_seed_tar_end, 1\n"
);
