# Advanced RTL Lab — Technical Decisions & Architecture (DECISIONS.md)

## DEC-001: VectorSignal Internal Representation and Masking
- **Decision**: Store internal binary vector value as `BigInt` normalized with bitmask `(1n << BigInt(width)) - 1n`.
- **Rationale**: JavaScript's bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`) implicitly cast numbers to 32-bit signed two's complement integers. For bit 31 set or high bit patterns, this causes negative numbers and sign extension bugs. Using BigInt with width masks guarantees exact unsigned semantics for bus widths from 1 to 64 bits while allowing accurate signed two's complement interpretation via `toSignedDecimal()`.

## DEC-002: Strict Bus Width Verification
- **Decision**: Throw explicit, informative `WidthMismatchError` on mismatched bit widths rather than silent truncation or zero-extension.
- **Rationale**: In digital VLSI ASIC physical design, mismatched bus widths in RTL code frequently cause synthesis mismatches and silent data loss. Forcing explicit slicing (`[msb:lsb]`) and concatenation (`{a, b}`) educates students on proper RTL design practices.

## DEC-003: Signed vs. Unsigned Flags
- **Decision**: Clearly distinguish Unsigned Carry (`C`) / Borrow from Signed 2's Complement Overflow (`V`).
- **Rationale**: In computer architecture and VLSI datapath design, students frequently conflate Carry and Overflow. Carry indicates unsigned wraparound outside $[0, 2^W - 1]$, while Overflow indicates signed wraparound outside $[-2^{W-1}, 2^{W-1} - 1]$ (computed as `(a[msb] == b[msb]) && (sum[msb] != a[msb])`).
