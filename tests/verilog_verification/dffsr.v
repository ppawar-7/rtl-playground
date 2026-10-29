module dffsr_module (
    clk,
    d,
    rst,
    q
);

    input wire d;
    input wire rst;
    input wire clk;
    output wire q;

    reg dff_sr_q;

    assign q = dff_sr_q;

    always @(posedge clk) begin
        if (rst) begin
            dff_sr_q <= 1'b0;
        end else begin
            dff_sr_q <= d;
        end
    end

endmodule