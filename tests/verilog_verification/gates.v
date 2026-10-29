module gates_module (
    a,
    b,
    y_and,
    y_or,
    y_xor,
    y_nand,
    y_nor,
    y_not
);

    input wire a;
    input wire b;
    output wire y_and;
    output wire y_or;
    output wire y_xor;
    output wire y_nand;
    output wire y_nor;
    output wire y_not;

    assign y_and = (a & b);
    assign y_or = (a | b);
    assign y_xor = (a ^ b);
    assign y_nand = (~(a & b));
    assign y_nor = (~(a | b));
    assign y_not = (~a);

endmodule