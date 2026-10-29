// Synthesizable IEEE 1364-2001 Verilog: Universal Shift Register
// Part of PD Playground Advanced RTL Lab
module adv_shift #(
    parameter WIDTH = 4
) (
    input  wire             clk,
    input  wire             rst,
    input  wire [1:0]       mode,     // 00=HOLD, 01=SHIFT_RIGHT, 10=SHIFT_LEFT, 11=PARALLEL_LOAD
    input  wire             sin_msb,  // Serial in from left (for shift right)
    input  wire             sin_lsb,  // Serial in from right (for shift left)
    input  wire [WIDTH-1:0] parallel_d,
    output reg  [WIDTH-1:0] parallel_q,
    output wire             sout_lsb, // Serial out (rightmost bit)
    output wire             sout_msb  // Serial out (leftmost bit)
);

    localparam MODE_HOLD  = 2'b00;
    localparam MODE_SHR   = 2'b01;
    localparam MODE_SHL   = 2'b10;
    localparam MODE_LOAD  = 2'b11;

    always @(posedge clk) begin
        if (rst) begin
            parallel_q <= {WIDTH{1'b0}};
        end else begin
            case (mode)
                MODE_HOLD: begin
                    parallel_q <= parallel_q;
                end
                MODE_SHR: begin
                    parallel_q <= {sin_msb, parallel_q[WIDTH-1:1]};
                end
                MODE_SHL: begin
                    parallel_q <= {parallel_q[WIDTH-2:0], sin_lsb};
                end
                MODE_LOAD: begin
                    parallel_q <= parallel_d;
                end
            endcase
        end
    end

    assign sout_lsb = parallel_q[0];
    assign sout_msb = parallel_q[WIDTH-1];

endmodule
