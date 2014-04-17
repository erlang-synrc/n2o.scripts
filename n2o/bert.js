// Micro BERT encoder/decoder
// Copyright (c) Maxim Sokhatsky (@5HT)

bert = {};
itoa = String.fromCharCode;

BERT = itoa(131);
SATOM = itoa(115);
ATOM = itoa(100);
BINARY = itoa(109);
SINT = itoa(97);
INT = itoa(98);
FLOAT = itoa(99);
STR = itoa(107);
LIST = itoa(108);
TUPLE = itoa(104);
LTUPLE = itoa(105);
NIL = itoa(106);
ZERO = itoa(0);

bert.atom = function (o) { return { type: "Atom", value: o, toString: function() { return this.value; } }; };
bert.binary = function (o) { return { type: "Binary", value: o, toString: function() { "<<'"+this.value;+"'>>" } }; };
bert.tuple = function() {
    return { type: "Tuple", value: arguments, toString: function() { var s = ""; 
        for (var i=0;i<this.value.length;i++) { if (s!=="") s+=","; s+=this.value[i]; }
        return "{" + s + "}"; } };
};

bert.en_inner = function (Obj) {
    if(Obj === undefined) return NIL;
    var func = 'en_' + typeof(Obj);
    return bert[func](Obj);
};

bert.en_string = function (Obj) { return STR + itol(Obj.length, 2) + Obj; };
bert.en_boolean = function (Obj) {
    if (Obj) { return bert.en_inner(bert.atom("true")); }
    else { return bert.en_inner(bert.atom("false")); }
};

bert.en_number = function (Obj) {
    var s, isInteger = (Obj % 1 === 0);
    if (!isInteger) { return bert.en_float(Obj); }
    if (isInteger && Obj >= 0 && Obj < 256) { return SINT + itol(Obj, 1); }
    return INT + itol(Obj, 4);
};

bert.en_float = function (Obj) {
    var s = Obj.toExponential();
    while (s.length < 31) { s += ZERO; }
    return FLOAT + s;
};

bert.en_object = function (Obj) {
    if (Obj.type === "Atom") { return bert.en_atom(Obj); }
    if (Obj.type === "Binary") { return bert.en_binary(Obj); }
    if (Obj.type === "Tuple") { return bert.en_tuple(Obj); }
    if (Obj.constructor.toString().indexOf("Array") !== -1) { return bert.en_array(Obj); }
    return bert.en_associative_array(Obj);
};

bert.en_atom = function (Obj) { return ATOM + itol(Obj.value.length, 2) + Obj.value; };
bert.en_binary = function (Obj) { return BINARY + itol(Obj.value.length, 4) + Obj.value; };
bert.en_tuple = function (Obj) {
    var i, s = "";
    if (Obj.value.length < 256) { s += TUPLE + itol(Obj.value.length, 1); }
    else { s += LTUPLE + itol(Obj.value.length, 4); }
    for (i = 0; i < Obj.value.length; i++) { s += bert.en_inner(Obj.value[i]); }
    return s;
};

bert.en_array = function (Obj) {
    var i, s = LIST + itol(Obj.length, 4);
    for (i = 0; i < Obj.length; i++) { s += bert.en_inner(Obj[i]); }
    s += NIL;
    return s;
};

bert.en_associative_array = function (Obj) {
    var key, Arr = [];
    for (key in Obj) { if (Obj.hasOwnProperty(key)) { Arr.push(bert.tuple(bert.atom(key), Obj[key])); } }
    return bert.en_array(Arr);
};

bert.de_atom = function (S, Count) {
    var Size, Value;
    Size = ltoi(S, Count);
    S = S.substring(Count);
    Value = S.substring(0, Size);
    if (Value === "true") { Value = true; }
    else if (Value === "false") { Value = false; }
    return { value: bert.atom(Value), rest:  S.substring(Size) };
};

bert.de_binary = function (S) {
    var Size = ltoi(S, 4);
    S = S.substring(4);
    return { value: bert.binary(S.substring(0, Size)), rest: S.substring(Size) };
};

bert.de_integer = function (S, Count) {
    var Value = ltoi(S, Count);
    S = S.substring(Count);
    return { value: Value, rest: S };
};

bert.de_float = function (S) {
    var Size = 31;
    return { value: parseFloat(S.substring(0, Size)), rest: S.substring(Size) };
};

bert.de_string = function (S) {
    var Size = ltoi(S, 2);
    S = S.substring(2);
    return { value: S.substring(0, Size), rest:  S.substring(Size) };
};

bert.de_list = function (S) {
    var Size, i, El, LastChar, Arr = [];
    Size = ltoi(S, 4);
    S = S.substring(4);
    for (i = 0; i < Size; i++) { El = bert.de_inner(S); Arr.push(El.value); S = El.rest; }
    LastChar = S[0];
    if (LastChar !== NIL) { throw ("BERT: Wrong NIL."); }
    S = S.substring(1);
    return { value: Arr, rest: S };
};

bert.de_tuple = function (S, Count) {
    var Size, i, El, Arr = [];
    Size = ltoi(S, Count);
    S = S.substring(Count);
    for (i = 0; i < Size; i++) { El = bert.de_inner(S); Arr.push(El.value); S = El.rest; }
    return { value: bert.tuple(Arr), rest: S };
};

bert.de_nil = function (S) { return { value: [], rest: S }; };

bert.de_inner = function (S) {
    var Type = S[0];
    S = S.substring(1);
    switch (Type) {
        case SATOM: bert.de_atom(S, 1);
        case ATOM: return bert.de_atom(S, 2);
        case BINARY: return bert.de_binary(S);
        case SINT: return bert.de_integer(S, 1);
        case INT: return bert.de_integer(S, 4);
        case FLOAT: return bert.de_float(S);
        case STR: return bert.de_string(S);
        case LIST: return bert.de_list(S);
        case TUPLE: return bert.de_tuple(S, 1);
        case NIL: return this.de_nil(S);
        default: throw ("BERT: " + S.charCodeAt(0));
    }
};

itol = function (Int, Length) {
    var isNegative, OriginalInt, i, Rem, s = "";
    isNegative = (Int < 0);
    if (isNegative) { Int = Int * (0 - 1); }
    OriginalInt = Int;
    for (i = 0; i < Length; i++) { 
        Rem = Int % 256;
        if (isNegative) { Rem = 255 - Rem; }
        s = String.fromCharCode(Rem) + s;
        Int = Math.floor(Int / 256);
    }
    if (Int > 0) { throw ("BERT: Range: " + OriginalInt); }
    return s;
};

ltoi = function (S, Length) {
    var isNegative, i, n, Num = 0;
    isNegative = (S.charCodeAt(0) > 128);
    for (i = 0; i < Length; i++) {
        n = S.charCodeAt(i);
        if (isNegative) { n = 255 - n; }
        if (Num === 0) { Num = n; }
        else { Num = Num * 256 + n; }
    }
    if (isNegative) { Num = Num * (0 - 1); }
    return Num;
};

bert.encode = function (o) { return BERT + bert.en_inner(o); };
bert.decode = function (S) {
    if (S[0] !== BERT) { throw ("Not a valid BERT."); }
    var Obj = this.de_inner(S.substring(1));
    if (Obj.rest !== "") { throw ("Invalid BERT."); }
    return Obj.value;
};

bert.ltoa = function (a) { for (var i = 0,s=""; i < a.length; i++) s += itoa(a[i]); return s; };
bert.decodebuf = function (S) { return bert.decode(bert.ltoa(new Uint8Array(S))); };
bert.encodebuf = function (s) { 
    var ori = bert.encode(s);
    var buf = new Uint8Array(new ArrayBuffer(ori.length));
    var s = "";
    for (var i=0; i < buf.length; i++) { buf[i] = ori.charCodeAt(i); s+=","+buf[i]; }
    return new Blob([buf.buffer]);
};

Bert = bert;
