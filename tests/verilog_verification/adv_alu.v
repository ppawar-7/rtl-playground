// Synthesizable IEEE 1364-2001 Verilog: Educational ALU
// Part of PD Playground Advanced RTL Lab
module adv_alu #(
    parameter WIDTH = 4
) (
    input  wire [WIDTH-1:0] a,
    input  wire [WIDTH-1:0] b,
    input  wire [3:0]       opcode,
    input  wire             cin,
    output reg  [WIDTH-1:0] result,
    output reg              flag_z,
    output reg              flag_c,
    output reg              flag_v,
    output wire             flag_n
);

    // Operation code definitions
    localparam OP_ADD   = 4'b0000;
    localparam OP_SUB   = 4'b0001;
    localparam OP_AND   = 4'b0010;
    localparam OP_OR    = 4'b0011;
    localparam OP_XOR   = 4'b0100;
    localparam OP_NOT   = 4'b0101;
    localparam OP_SHL   = 4'b0110;
    localparam OP_SHR   = 4'b0111;
    localparam OP_PASSA = 4'b1000;
    localparam OP_PASSB = 4'b1001;

    // Combinational evaluation
    always @(*) begin
        // Safe default assignments to prevent unintended latches
        result = {WIDTH{1'b0}};
        flag_c = 1'b0;
        flag_v = 1'b0;

        case (opcode)
            OP_ADD: begin
                {flag_c, result} = a + b + cin;
                // Signed 2's complement overflow: (a[msb] == b[msb]) && (result[msb] != a[msb])
                flag_v = (a[WIDTH-1] == b[WIDTH-1]) && (result[WIDTH-1] != a[WIDTH-1]);
            end

            OP_SUB: begin
                // Borrow is set if a < (b + cin)
                flag_c = (a < (b + cin));
                result = a - b - cin;
                // Signed overflow: (a[msb] != b[msb]) && (result[msb] != a[msb])
                flag_v = (a[WIDTH-1] != b[WIDTH-1]) && (result[WIDTH-1] != a[WIDTH-1]);
            end

            OP_AND: begin
                result = a & b;
            end

            OP_OR: begin
                result = a | b;
            end

            OP_XOR: begin
                result = a ^ b;
            end

            OP_NOT: begin
                result = ~a;
            end

            OP_SHL: begin
                result = {a[WIDTH-2:0], 1'b0};
                flag_c = a[WIDTH-1]; // Shifted out MSB
            end

            OP_SHR: begin
                result = {1'b0, a[WIDTH-1:1]};
                flag_c = a[0]; // Shifted out LSB
            end

            OP_PASSA: begin
                result = a;
            end

            OP_PASSB: begin
                result = b;
            end

            default: begin
                result = {WIDTH{1'b0}};
            end
        endcase

        // Zero flag: 1 if all bits of result are 0
        flag_z = (result == {WIDTH{1'b0}});
    end

    // Negative flag: 1 if MSB is set (2's complement signed negative)
    assign flag_n = result[WIDTH-1];

endmodule
