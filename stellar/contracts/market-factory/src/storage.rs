use soroban_sdk::{contracttype, Address, BytesN, Env};

const TTL_BUMP: u32 = 518_400;

#[contracttype]
#[derive(Clone)]
pub enum FactoryDataKey {
    Admin,
    MarketWasmHash,
    MarketCount,
    MarketAddr(u64),
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&FactoryDataKey::Admin)
}

pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&FactoryDataKey::Admin).unwrap()
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&FactoryDataKey::Admin, admin);
}

pub fn get_wasm_hash(env: &Env) -> BytesN<32> {
    env.storage().instance().get(&FactoryDataKey::MarketWasmHash).unwrap()
}

pub fn set_wasm_hash(env: &Env, hash: &BytesN<32>) {
    env.storage().instance().set(&FactoryDataKey::MarketWasmHash, hash);
}

pub fn get_market_count(env: &Env) -> u64 {
    env.storage().instance().get(&FactoryDataKey::MarketCount).unwrap_or(0)
}

pub fn set_market_count(env: &Env, count: u64) {
    env.storage().instance().set(&FactoryDataKey::MarketCount, &count);
}

pub fn get_market_addr(env: &Env, id: u64) -> Address {
    env.storage().persistent().get(&FactoryDataKey::MarketAddr(id)).unwrap()
}

pub fn set_market_addr(env: &Env, id: u64, addr: &Address) {
    let key = FactoryDataKey::MarketAddr(id);
    env.storage().persistent().set(&key, addr);
    env.storage().persistent().extend_ttl(&key, TTL_BUMP, TTL_BUMP);
}
