module mux2_module (
    a,
    b,
    sel,
    y
);

    input wire a;
    input wire b;
    input wire sel;
    output wire y;

    assign y = (sel ? b : a);

endmodule