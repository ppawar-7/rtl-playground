module dffe_module (
    clk,
    d,
    en,
    q
);

    input wire d;
    input wire en;
    input wire clk;
    output wire q;

    reg dffe_q;

    assign q = dffe_q;

    always @(posedge clk) begin
        if (en) begin
            dffe_q <= d;
        end
    end

endmodule