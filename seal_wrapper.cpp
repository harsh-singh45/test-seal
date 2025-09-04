#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <seal/seal.h>
#include <seal/util/defines.h> 
#include <sstream>
#include <vector>
#include <string>

namespace py = pybind11;
using namespace seal;

// Base64 functions
static const std::string b64_chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789-_";

std::string b64_encode(const std::string &in) {
    std::string out;
    int val = 0, valb = -6;
    for (uint8_t c : in) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(b64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(b64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    while (out.size() % 4) out.push_back('=');
    return out;
}

std::string b64_decode(const std::string &in) {
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[b64_chars[i]] = i;

    std::string out;
    int val = 0, valb = -8;
    for (uint8_t c : in) {
        if (c == '=' || T[c] == -1) break;
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

// Class to manage SEAL state
class SEALWrapper {
private:
    std::shared_ptr<SEALContext> context_;
    PublicKey public_key_;
    SecretKey secret_key_;
    RelinKeys relin_keys_;
    std::shared_ptr<Encryptor> encryptor_;
    std::shared_ptr<Decryptor> decryptor_;
    std::shared_ptr<Evaluator> evaluator_;
    std::shared_ptr<BatchEncoder> batch_encoder_;

public:
    SEALWrapper() = default;

    void init() {
        EncryptionParameters parms(scheme_type::bfv);
        size_t poly_modulus_degree = 4096; // Increased for better security
        parms.set_poly_modulus_degree(poly_modulus_degree);
        parms.set_coeff_modulus(CoeffModulus::BFVDefault(poly_modulus_degree));
        parms.set_plain_modulus(PlainModulus::Batching(poly_modulus_degree, 20));

        context_ = std::make_shared<SEALContext>(parms);
        if (!context_->parameters_set()) {
            throw std::runtime_error("SEALContext parameters are not set. Check parameters for validity.");
        }

        KeyGenerator keygen(*context_);
        keygen.create_public_key(public_key_);
        secret_key_ = keygen.secret_key();
        keygen.create_relin_keys(relin_keys_);

        encryptor_ = std::make_shared<Encryptor>(*context_, public_key_);
        decryptor_ = std::make_shared<Decryptor>(*context_, secret_key_);
        evaluator_ = std::make_shared<Evaluator>(*context_);
        batch_encoder_ = std::make_shared<BatchEncoder>(*context_);
    }

    std::string encrypt_value(int value) {
        if (!encryptor_ || !batch_encoder_) {
            throw std::runtime_error("SEAL is not initialized.");
        }
        std::vector<uint64_t> vec(batch_encoder_->slot_count(), 0ULL);
        vec[0] = static_cast<uint64_t>(value);

        Plaintext plain;
        batch_encoder_->encode(vec, plain);

        Ciphertext encrypted;
        encryptor_->encrypt(plain, encrypted);

        std::stringstream ss;
        encrypted.save(ss);
        return b64_encode(ss.str());
    }

    int decrypt_value(const std::string &b64_cipher) {
        if (!decryptor_ || !batch_encoder_) {
            throw std::runtime_error("SEAL is not initialized.");
        }
        std::string bin = b64_decode(b64_cipher);
        std::stringstream ss(bin);

        Ciphertext encrypted;
        try {
            encrypted.load(*context_, ss);
        } catch (const std::exception& e) {
            throw std::runtime_error("Failed to load ciphertext for decryption: " + std::string(e.what()));
        }

        Plaintext plain;
        decryptor_->decrypt(encrypted, plain);
        
        std::vector<uint64_t> vec;
        batch_encoder_->decode(plain, vec);
        
        if (vec.empty()) {
            throw std::runtime_error("Decryption resulted in an empty vector. Possible decryption failure.");
        }
        
        return static_cast<int>(vec[0]);
    }

    std::string add_encrypted(const std::string &b64_a, const std::string &b64_b) {
        if (!evaluator_) {
            throw std::runtime_error("SEAL is not initialized.");
        }
        std::string bin_a = b64_decode(b64_a);
        std::string bin_b = b64_decode(b64_b);

        std::stringstream ssa(bin_a), ssb(bin_b);
        Ciphertext A, B;
        try {
            A.load(*context_, ssa);
            B.load(*context_, ssb);
        } catch (const std::exception& e) {
            throw std::runtime_error("Failed to load ciphertexts for addition: " + std::string(e.what()));
        }

        Ciphertext result;
        evaluator_->add(A, B, result);

        std::stringstream ss;
        result.save(ss);
        return b64_encode(ss.str());
    }

    std::string subtract_encrypted(const std::string &b64_a, const std::string &b64_b) {
        if (!evaluator_) {
            throw std::runtime_error("SEAL is not initialized.");
        }
        std::string bin_a = b64_decode(b64_a);
        std::string bin_b = b64_decode(b64_b);

        std::stringstream ssa(bin_a), ssb(bin_b);
        Ciphertext A, B;
        try {
            A.load(*context_, ssa);
            B.load(*context_, ssb);
        } catch (const std::exception& e) {
            throw std::runtime_error("Failed to load ciphertexts for subtraction: " + std::string(e.what()));
        }

        Ciphertext result;
        evaluator_->sub(A, B, result);

        std::stringstream ss;
        result.save(ss);
        return b64_encode(ss.str());
    }

    std::string multiply_encrypted(const std::string &b64_a, const std::string &b64_b) {
        if (!evaluator_ || !context_->using_keyswitching()) {
            throw std::runtime_error("SEAL is not initialized or relinearization is not supported.");
        }
        std::string bin_a = b64_decode(b64_a);
        std::string bin_b = b64_decode(b64_b);

        std::stringstream ssa(bin_a), ssb(bin_b);
        Ciphertext A, B;
        try {
            A.load(*context_, ssa);
            B.load(*context_, ssb);
        } catch (const std::exception& e) {
            throw std::runtime_error("Failed to load ciphertexts for multiplication: " + std::string(e.what()));
        }

        Ciphertext result;
        evaluator_->multiply(A, B, result);

        // Crucial step: Relinearize to reduce noise and ciphertext size
        evaluator_->relinearize_inplace(result, relin_keys_);

        std::stringstream ss;
        result.save(ss);
        return b64_encode(ss.str());
    }
};

// Global instance of the SEALWrapper. Still a global, but now a controlled object.
// For true thread safety, this instance would need a mutex. For single-process
// FastAPI, this is a reasonable starting point.
static SEALWrapper seal_instance;

// Python module definition
PYBIND11_MODULE(seal_wrapper, m) {
    m.doc() = "SEAL wrapper with Base64 safe I/O (Production Grade)";
    
    // Bind member functions of the SEALWrapper class
    m.def("init_seal", []() {
        seal_instance.init();
    });

    m.def("encrypt_value", [](int value) {
        return seal_instance.encrypt_value(value);
    });

    m.def("decrypt_value", [](const std::string& b64_cipher) {
        return seal_instance.decrypt_value(b64_cipher);
    });

    m.def("add_encrypted", [](const std::string& b64_a, const std::string& b64_b) {
        return seal_instance.add_encrypted(b64_a, b64_b);
    });

    m.def("subtract_encrypted", [](const std::string& b64_a, const std::string& b64_b) {
        return seal_instance.subtract_encrypted(b64_a, b64_b);
    });

    m.def("multiply_encrypted", [](const std::string& b64_a, const std::string& b64_b) {
        return seal_instance.multiply_encrypted(b64_a, b64_b);
    });
}