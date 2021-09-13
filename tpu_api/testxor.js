var Base64 = function(){
    return {
        decode: function(str){
            return Buffer.from(str, "base64").toString("utf8")
        },
        encode: function(str){
            return Buffer.from(str, "utf8").toString("base64")
        }
    }
}();

var Xor = function() {
    return {
        xor: function(str, key) {
            var newstr = '';
            for (var i = 0; i < str.length; i++) {
                var char = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                newstr += String.fromCharCode(char)
            }
            return newstr
        },
        decrypt: function(str, key, base64) {
            console.log("encrypted: ", str)
            console.log("key: ", key)
            base64 = (base64 != undefined) ? base64 : true;
            if (base64) {
                str = Base64.decode(str)
            }
            return this.xor(str, key)
        },
        encrypt: function(str, key, base64) {
            base64 = (base64 != undefined) ? base64 : true;
            var encodedStr = this.xor(str, key);
            if (base64) {
                return Base64.encode(encodedStr)
            } else {
                return encodedStr
            }
        }
    }
}();

console.log("decrypted:", Xor.decrypt("0ZTRk9Cb0IbQjNGX0KPQgdG00Z5QCw==", "HcY30ga9Nnp8sZvJ",))