module mux_case_module (
    a,
    b,
    sel,
    y
);

    input wire a;
    input wire b;
    input wire sel;
    output reg y;

    // Combinational procedural block (always @(*) with case / if-else)
    always @(*) begin
        case (sel)
            1'b0: y = a;
            1'b1: y = b;
            default: y = 1'bx;
        endcase
    end

endmodule