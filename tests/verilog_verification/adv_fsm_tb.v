`timescale 1ns/1ps

module adv_fsm_tb;
    reg  clk, rst, timer;
    wire light_g, light_y, light_r;

    adv_fsm uut (
        .clk(clk), .rst(rst), .timer(timer),
        .light_g(light_g), .light_y(light_y), .light_r(light_r)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; timer = 0;
        #12; // Posedge 1: Reset to STATE_RED
        rst = 0;
        if (light_r !== 1'b1 || light_g !== 1'b0 || light_y !== 1'b0) $fatal(1, "FSM reset failed");
        $display("PASS: FSM Reset to RED: R=%b, Y=%b, G=%b", light_r, light_y, light_g);

        // Timer=1 on RED -> Transition to GREEN
        timer = 1; #10;
        if (light_g !== 1'b1 || light_r !== 1'b0 || light_y !== 1'b0) $fatal(1, "FSM RED->GREEN fail");
        $display("PASS: FSM Transition RED -> GREEN (timer=1): G=%b", light_g);

        // Timer=0 on GREEN -> Hold GREEN
        timer = 0; #10;
        if (light_g !== 1'b1) $fatal(1, "FSM GREEN hold fail");
        $display("PASS: FSM GREEN held state (timer=0): G=%b", light_g);

        // Timer=1 on GREEN -> Transition to YELLOW
        timer = 1; #10;
        if (light_y !== 1'b1 || light_g !== 1'b0) $fatal(1, "FSM GREEN->YELLOW fail");
        $display("PASS: FSM Transition GREEN -> YELLOW (timer=1): Y=%b", light_y);

        // Timer=1 on YELLOW -> Transition to RED
        timer = 1; #10;
        if (light_r !== 1'b1 || light_y !== 1'b0) $fatal(1, "FSM YELLOW->RED fail");
        $display("PASS: FSM Transition YELLOW -> RED (timer=1): R=%b", light_r);

        $display("ADVANCED FSM TRAFFIC LIGHT CONTROLLER FULLY VERIFIED.");
        $finish;
    end
endmodule
