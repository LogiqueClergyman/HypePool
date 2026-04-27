#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};
use soroban_sdk::token::{TokenClient, StellarAssetClient};
use prediction_market::types::{ContentType, MarketConfig, Metric};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token_client = TokenClient::new(env, &token_address);
    let token_admin_client = StellarAssetClient::new(env, &token_address);
    (token_address.clone(), token_client, token_admin_client)
}

fn setup_factory_test<'a>() -> (Env, MarketFactoryClient<'a>, Address, Address, BytesN<32>, MarketConfig) {
    let env = Env::default();
    env.mock_all_auths();
    
    let wasm_bytes = include_bytes!("../../../target/wasm32v1-none/release/prediction_market.wasm");
    let wasm_hash = env.deployer().upload_contract_wasm(wasm_bytes as &[u8]);
    
    let factory_id = env.register(MarketFactory, ());
    let client = MarketFactoryClient::new(&env, &factory_id);
    
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let oracle = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let (token_address, _, _) = create_token_contract(&env, &token_admin);
    
    let config = MarketConfig {
        content_url: String::from_str(&env, "https://youtube.com/watch?v=factory123"),
        content_type: ContentType::YouTube,
        metric: Metric::Views,
        threshold: 100_000,
        deadline: 1000,
        resolution_deadline: 2000,
        min_bet: 1_000_000,
        token: token_address.clone(),
        oracle: oracle.clone(),
        creator: creator.clone(),
        platform_fee_bps: 200,
    };
    
    env.ledger().with_mut(|li| li.timestamp = 500);
    
    (env, client, admin, creator, wasm_hash, config)
}

#[test]
fn test_create_and_retrieve_market() {
    let (_, client, admin, creator, wasm_hash, config) = setup_factory_test();
    
    client.init(&admin, &wasm_hash);
    
    let (id, addr) = client.create_market(&creator, &config);
    
    assert_eq!(id, 0);
    assert_eq!(client.get_market(&0), addr);
    assert_eq!(client.get_market_count(), 1);
}

#[test]
fn test_create_multiple_markets() {
    let (_, client, admin, creator, wasm_hash, config) = setup_factory_test();
    
    client.init(&admin, &wasm_hash);
    
    let (id1, addr1) = client.create_market(&creator, &config);
    let (id2, addr2) = client.create_market(&creator, &config);
    let (id3, addr3) = client.create_market(&creator, &config);
    
    assert_eq!(id1, 0);
    assert_eq!(id2, 1);
    assert_eq!(id3, 2);
    
    assert_eq!(client.get_market_count(), 3);
    
    assert!(addr1 != addr2);
    assert!(addr2 != addr3);
    assert!(addr1 != addr3);
}
