module shift_reg_module (
    clk,
    d_in,
    q1,
    q2
);

    input wire d_in;
    input wire clk;
    output wire q1;
    output wire q2;

    reg ff1_q;
    reg ff2_q;

    assign q1 = ff1_q;
    assign q2 = ff2_q;

    always @(posedge clk) begin
        ff1_q <= d_in;
        ff2_q <= ff1_q;
    end

endmodule