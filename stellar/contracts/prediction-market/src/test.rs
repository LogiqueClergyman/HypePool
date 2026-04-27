#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};
use soroban_sdk::token::{TokenClient, StellarAssetClient};
use crate::types::{ContentType, MarketConfig, Metric, Outcome};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token_client = TokenClient::new(env, &token_address);
    let token_admin_client = StellarAssetClient::new(env, &token_address);
    (token_address.clone(), token_client, token_admin_client)
}

fn setup_test<'a>() -> (Env, PredictionMarketClient<'a>, Address, Address, Address, Address, MarketConfig, TokenClient<'a>) {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(PredictionMarket, ());
    let client = PredictionMarketClient::new(&env, &contract_id);
    
    let oracle = Address::generate(&env);
    let creator = oracle.clone();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    
    let admin = Address::generate(&env);
    let (token_address, token_client, token_admin) = create_token_contract(&env, &admin);
    
    token_admin.mint(&alice, &10_000_000);
    token_admin.mint(&bob, &10_000_000);
    
    let config = MarketConfig {
        content_url: String::from_str(&env, "https://youtube.com/watch?v=test123"),
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
    
    (env, client, oracle, alice, bob, admin, config, token_client)
}

#[test]
fn test_full_lifecycle_yes_wins() {
    let (env, client, oracle, alice, bob, _, config, token_client) = setup_test();
    client.initialize(&config);
    
    client.buy_yes(&alice, &5_000_000);
    client.buy_no(&bob, &3_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    client.resolve(&oracle, &Outcome::Yes);
    
    let payout = client.claim(&alice);
    assert_eq!(payout, 7_940_000);
    
    assert_eq!(token_client.balance(&alice), 12_940_000);
    
    let res = client.try_claim(&bob);
    assert_eq!(res, Err(Ok(MarketError::NothingToClaim)));
}

#[test]
fn test_full_lifecycle_no_wins() {
    let (env, client, oracle, alice, bob, _, config, _) = setup_test();
    client.initialize(&config);
    
    client.buy_yes(&alice, &5_000_000);
    client.buy_no(&bob, &3_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    client.resolve(&oracle, &Outcome::No);
    
    let payout = client.claim(&bob);
    assert_eq!(payout, 7_900_000);
    
    let res = client.try_claim(&alice);
    assert_eq!(res, Err(Ok(MarketError::NothingToClaim)));
}

#[test]
fn test_proportional_payout() {
    let (env, client, oracle, alice, bob, _admin, config, _token_client) = setup_test();
    client.initialize(&config);
    
    let charlie = Address::generate(&env);
    let token_admin = StellarAssetClient::new(&env, &config.token);
    token_admin.mint(&charlie, &10_000_000);
    
    client.buy_yes(&alice, &2_000_000);
    client.buy_yes(&bob, &3_000_000);
    client.buy_no(&charlie, &5_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);
    
    let alice_payout = client.claim(&alice);
    let bob_payout = client.claim(&bob);
    
    assert_eq!(alice_payout, 3_960_000);
    assert_eq!(bob_payout, 5_940_000);
}

#[test]
fn test_bet_after_deadline() {
    let (env, client, _, alice, _, _, config, _) = setup_test();
    client.initialize(&config);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    let res = client.try_buy_yes(&alice, &2_000_000);
    assert_eq!(res, Err(Ok(MarketError::BettingClosed)));
}

#[test]
fn test_unauthorized_resolve() {
    let (env, client, _, _, _, _, config, _) = setup_test();
    client.initialize(&config);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    let fake_oracle = Address::generate(&env);
    let res = client.try_resolve(&fake_oracle, &Outcome::Yes);
    assert_eq!(res, Err(Ok(MarketError::NotOracle)));
}

#[test]
fn test_refund_unresolved() {
    let (env, client, _, alice, _, _, config, token_client) = setup_test();
    client.initialize(&config);
    
    client.buy_yes(&alice, &2_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 2500);
    
    let total = client.refund(&alice);
    assert_eq!(total, 2_000_000);
    assert_eq!(token_client.balance(&alice), 10_000_000);
    
    let res = client.try_refund(&alice);
    assert_eq!(res, Err(Ok(MarketError::AlreadyClaimed)));
}

#[test]
fn test_below_min_bet() {
    let (_, client, _, alice, _, _, config, _) = setup_test();
    client.initialize(&config);
    
    let res = client.try_buy_yes(&alice, &500_000);
    assert_eq!(res, Err(Ok(MarketError::BelowMinBet)));
}

#[test]
fn test_double_claim() {
    let (env, client, oracle, alice, bob, _, config, _) = setup_test();
    client.initialize(&config);
    
    client.buy_yes(&alice, &5_000_000);
    client.buy_no(&bob, &3_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);
    
    client.claim(&alice);
    let res = client.try_claim(&alice);
    assert_eq!(res, Err(Ok(MarketError::AlreadyClaimed)));
}

#[test]
fn test_multiple_bets_same_user() {
    let (_, client, _, alice, _, _, config, _) = setup_test();
    client.initialize(&config);
    
    client.buy_yes(&alice, &2_000_000);
    client.buy_yes(&alice, &2_000_000);
    
    let pos = client.get_position(&alice);
    assert_eq!(pos, (4_000_000, 0));
    
    let state = client.get_state();
    assert_eq!(state.total_bettors, 1);
}
