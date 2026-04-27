#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env};
use prediction_market::types::MarketConfig;
use prediction_market::PredictionMarketClient;

mod storage;

mod test;

#[contract]
pub struct MarketFactory;

#[contractimpl]
impl MarketFactory {
    pub fn init(env: Env, admin: Address, market_wasm_hash: BytesN<32>) {
        if storage::has_admin(&env) {
            panic!("already initialized");
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_wasm_hash(&env, &market_wasm_hash);
        storage::set_market_count(&env, 0);
    }

    pub fn create_market(env: Env, creator: Address, config: MarketConfig) -> (u64, Address) {
        if !storage::has_admin(&env) {
            panic!("not initialized");
        }
        creator.require_auth();

        let market_id = storage::get_market_count(&env);
        let wasm_hash = storage::get_wasm_hash(&env);

        let salt = env.crypto().sha256(&Bytes::from_slice(&env, &market_id.to_be_bytes()));

        let market_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy(wasm_hash);

        let market_client = PredictionMarketClient::new(&env, &market_address);
        let mut market_config = config;
        market_config.creator = creator.clone();
        market_client.initialize(&market_config);

        storage::set_market_addr(&env, market_id, &market_address);
        storage::set_market_count(&env, market_id + 1);

        (market_id, market_address)
    }

    pub fn get_market(env: Env, market_id: u64) -> Address {
        storage::get_market_addr(&env, market_id)
    }

    pub fn get_market_count(env: Env) -> u64 {
        storage::get_market_count(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }
}
