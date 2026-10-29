module half_adder_module (
    a,
    b,
    sum,
    carry
);

    input wire a;
    input wire b;
    output wire sum;
    output wire carry;

    assign sum = (a ^ b);
    assign carry = (a & b);

endmodule