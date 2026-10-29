`timescale 1ns/1ps

module adv_shift_tb;
    reg        clk, rst;
    reg  [1:0] mode;
    reg        sin_msb, sin_lsb;
    reg  [3:0] parallel_d;
    wire [3:0] parallel_q;
    wire       sout_lsb, sout_msb;

    adv_shift #(.WIDTH(4)) uut (
        .clk(clk), .rst(rst), .mode(mode),
        .sin_msb(sin_msb), .sin_lsb(sin_lsb),
        .parallel_d(parallel_d), .parallel_q(parallel_q),
        .sout_lsb(sout_lsb), .sout_msb(sout_msb)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; mode = 2'b00; sin_msb = 0; sin_lsb = 0; parallel_d = 4'h0;
        #12; rst = 0;

        // Parallel load 4'b1011 (mode 11)
        mode = 2'b11; parallel_d = 4'b1011; #10;
        if (parallel_q !== 4'b1011) $fatal(1, "Shift load failed");
        $display("PASS: Parallel load 4'b1011: q = %b, sout_lsb = %b, sout_msb = %b", parallel_q, sout_lsb, sout_msb);

        // Shift Right with sin_msb = 0 (mode 01) -> 4'b0101, sout_lsb was 1
        mode = 2'b01; sin_msb = 1'b0; #10;
        if (parallel_q !== 4'b0101 || sout_lsb !== 1'b1) $fatal(1, "Shift right fail");
        $display("PASS: Shift right (sin=0): q = %b, sout_lsb = %b", parallel_q, sout_lsb);

        // Shift Right with sin_msb = 1 -> 4'b1010
        sin_msb = 1'b1; #10;
        if (parallel_q !== 4'b1010) $fatal(1, "Shift right with 1 fail");
        $display("PASS: Shift right (sin=1): q = %b", parallel_q);

        // Shift Left with sin_lsb = 1 (mode 10) -> 4'b0101
        mode = 2'b10; sin_lsb = 1'b1; #10;
        if (parallel_q !== 4'b0101) $fatal(1, "Shift left fail");
        $display("PASS: Shift left (sin=1): q = %b", parallel_q);

        // Hold mode (mode 00)
        mode = 2'b00; #10;
        if (parallel_q !== 4'b0101) $fatal(1, "Shift hold fail");
        $display("PASS: Shift register held state: q = %b", parallel_q);

        $display("ADVANCED UNIVERSAL SHIFT REGISTER FULLY VERIFIED.");
        $finish;
    end
endmodule
