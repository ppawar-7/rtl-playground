// Synthesizable IEEE 1364-2001 Verilog: Finite State Machine (2-Process Architecture)
// Part of PD Playground Advanced RTL Lab
module adv_fsm (
    input  wire clk,
    input  wire rst,
    input  wire timer,
    output reg  light_g,
    output reg  light_y,
    output reg  light_r
);

    // State Encodings
    localparam STATE_GREEN = 2'd0;
    localparam STATE_YELLOW = 2'd1;
    localparam STATE_RED = 2'd2;

    reg [1:0] current_state;
    reg [1:0] next_state;

    // Process 1: Sequential state register
    always @(posedge clk) begin
        if (rst) begin
            current_state <= STATE_RED;
        end else begin
            current_state <= next_state;
        end
    end

    // Process 2: Combinational next-state and output logic
    always @(*) begin
        // Safe defaults prevent latch inference
        next_state = current_state;

        case (current_state)
            STATE_GREEN: begin
                if (timer == 1) begin
                    next_state = STATE_YELLOW;
                end
                else if (timer == 0) begin
                    next_state = STATE_GREEN;
                end
                else begin
                    next_state = STATE_GREEN;
                end
            end
            STATE_YELLOW: begin
                if (timer == 1) begin
                    next_state = STATE_RED;
                end
                else if (timer == 0) begin
                    next_state = STATE_RED;
                end
                else begin
                    next_state = STATE_YELLOW;
                end
            end
            STATE_RED: begin
                if (timer == 1) begin
                    next_state = STATE_GREEN;
                end
                else if (timer == 0) begin
                    next_state = STATE_RED;
                end
                else begin
                    next_state = STATE_RED;
                end
            end
            default: begin
                next_state = STATE_RED;
            end
        endcase
    end

    // Process 3: Registered or combinational output decoding
    always @(*) begin
        case (current_state)
            STATE_GREEN: begin
                light_g = 1'b1;
                light_y = 1'b0;
                light_r = 1'b0;
            end
            STATE_YELLOW: begin
                light_g = 1'b0;
                light_y = 1'b1;
                light_r = 1'b0;
            end
            STATE_RED: begin
                light_g = 1'b0;
                light_y = 1'b0;
                light_r = 1'b1;
            end
            default: begin
                light_g = 1'b0;
                light_y = 1'b0;
                light_r = 1'b0;
            end
        endcase
    end

endmodule
