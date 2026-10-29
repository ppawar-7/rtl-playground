`timescale 1ns/1ps

module adv_counter_tb;
    reg        clk, rst, en, up_down;
    wire [3:0] count;
    wire       terminal_count;

    adv_counter #(.WIDTH(4), .MODULO(16)) uut (
        .clk(clk), .rst(rst), .en(en), .up_down(up_down),
        .count(count), .terminal_count(terminal_count)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; en = 1; up_down = 1;
        #12; // Posedge 1: Reset to 0
        rst = 0;
        if (count !== 4'd0 || terminal_count !== 1'b0) $fatal(1, "Counter reset failed");
        $display("PASS: Counter reset to 0: count = %d, tc = %b", count, terminal_count);

        // Count up 5 cycles -> count = 5
        repeat (5) #10;
        if (count !== 4'd5) $fatal(1, "Counter count up failed");
        $display("PASS: Counter reached count = %d", count);

        // Count up remaining 10 cycles -> count = 15 (TC asserted)
        repeat (10) #10;
        if (count !== 4'd15 || terminal_count !== 1'b1) $fatal(1, "Counter TC failed");
        $display("PASS: Terminal count asserted at max modulus: count = %d, tc = %b", count, terminal_count);

        // Rollover to 0 on next posedge
        #10;
        if (count !== 4'd0 || terminal_count !== 1'b0) $fatal(1, "Counter rollover failed");
        $display("PASS: Modulo counter rollover to 0 verified: count = %d", count);

        // Count down 1 cycle -> wraps to 15
        up_down = 0; #10;
        if (count !== 4'd15) $fatal(1, "Counter down rollover failed");
        $display("PASS: Down-counting underflow rollover to 15 verified: count = %d", count);

        $display("ADVANCED MODULO COUNTER FULLY VERIFIED.");
        $finish;
    end
endmodule
