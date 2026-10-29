// Synthesizable IEEE 1364-2001 Verilog: Modulo Counter with Terminal Count
// Part of PD Playground Advanced RTL Lab
module adv_counter #(
    parameter WIDTH = 4,
    parameter MODULO = 16
) (
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    input  wire             up_down, // 1 = up, 0 = down
    output reg  [WIDTH-1:0] count,
    output wire             terminal_count
);

    always @(posedge clk) begin
        if (rst) begin
            count <= {WIDTH{1'b0}};
        end else if (en) begin
            if (up_down) begin
                if (count == MODULO - 1)
                    count <= {WIDTH{1'b0}};
                else
                    count <= count + 1'b1;
            end else begin
                if (count == {WIDTH{1'b0}})
                    count <= MODULO - 1;
                else
                    count <= count - 1'b1;
            end
        end
    end

    // Terminal count is asserted when counter reaches peak modulus
    assign terminal_count = (count == MODULO - 1);

endmodule
