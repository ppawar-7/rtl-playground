module dff_module (
    clk,
    d,
    q
);

    input wire d;
    input wire clk;
    output wire q;

    reg ff_q;

    assign q = ff_q;

    always @(posedge clk) begin
        ff_q <= d;
    end

endmodule