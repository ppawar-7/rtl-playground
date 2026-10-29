module multi_dff_module (
    clk,
    d0,
    d1,
    q0,
    q1
);

    input wire d0;
    input wire d1;
    input wire clk;
    output wire q0;
    output wire q1;

    reg reg0_q;
    reg reg1_q;

    assign q0 = reg0_q;
    assign q1 = reg1_q;

    always @(posedge clk) begin
        reg0_q <= d0;
        reg1_q <= d1;
    end

endmodule