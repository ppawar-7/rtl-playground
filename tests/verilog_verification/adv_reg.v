// Synthesizable IEEE 1364-2001 Verilog: Multi-Bit Register
// Part of PD Playground Advanced RTL Lab
module adv_reg #(
    parameter WIDTH = 4,
    parameter RESET_VAL = 0
) (
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    input  wire [WIDTH-1:0] d,
    output reg  [WIDTH-1:0] q
);

    // Sequential state register with synchronous active-high reset
    always @(posedge clk) begin
        if (rst) begin
            q <= RESET_VAL;
        end else if (en) begin
            q <= d;
        end
    end

endmodule
