module dffesr_module (
    clk,
    d,
    en,
    rst,
    q
);

    input wire d;
    input wire en;
    input wire rst;
    input wire clk;
    output wire q;

    reg dff_esr_q;

    assign q = dff_esr_q;

    always @(posedge clk) begin
        if (rst) begin
            dff_esr_q <= 1'b0;
        end else if (en) begin
            dff_esr_q <= d;
        end
    end

endmodule