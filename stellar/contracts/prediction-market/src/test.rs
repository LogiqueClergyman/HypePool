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

fn setup_test<'a>(
    env: &Env,
    deadline: u64,
) -> (PredictionMarketClient<'a>, Address, Address, Address, Address, Address, TokenClient<'a>) {
    env.mock_all_auths();
    
    let contract_id = env.register(PredictionMarket, ());
    let client = PredictionMarketClient::new(env, &contract_id);
    
    let oracle = Address::generate(env);
    let creator = oracle.clone();
    let alice = Address::generate(env);
    let bob = Address::generate(env);
    let charlie = Address::generate(env);
    let dave = Address::generate(env);
    let sniper = Address::generate(env);
    
    let admin = Address::generate(env);
    let (token_address, token_client, token_admin) = create_token_contract(env, &admin);
    
    token_admin.mint(&alice, &10_000_000);
    token_admin.mint(&bob, &10_000_000);
    token_admin.mint(&charlie, &10_000_000);
    token_admin.mint(&dave, &10_000_000);
    token_admin.mint(&sniper, &10_000_000);
    
    let config = MarketConfig {
        content_url: String::from_str(env, "https://youtube.com/watch?v=test123"),
        content_type: ContentType::YouTube,
        metric: Metric::Views,
        threshold: 100_000,
        deadline,
        resolution_deadline: deadline + 1000,
        min_bet: 1_000_000,
        token: token_address.clone(),
        oracle: oracle.clone(),
        creator: creator.clone(),
        platform_fee_bps: 200,
        created_at: env.ledger().timestamp(),
    };
    
    client.initialize(&config);
    
    (client, oracle, alice, bob, charlie, dave, token_client)
}

#[test]
fn test_full_lifecycle_yes_wins() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, oracle, alice, bob, _, _, token_client) = setup_test(&env, 1000);
    
    client.buy_yes(&alice, &5_000_000);
    client.buy_no(&bob, &3_000_000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);
    
    let payout = client.claim(&alice);
    assert_eq!(payout, 7_940_000);
    assert_eq!(token_client.balance(&alice), 12_940_000);
}

#[test]
fn test_time_weighted_payout() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, bob, charlie, _, _) = setup_test(&env, 1000);

    client.buy_yes(&alice, &2_000_000);
    client.buy_no(&charlie, &4_000_000);

    env.ledger().with_mut(|li| li.timestamp = 500);
    client.buy_yes(&bob, &2_000_000);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    let bob_payout = client.claim(&bob);

    assert_eq!(alice_payout, 5_136_000);
    assert_eq!(bob_payout, 2_784_000);
}

#[test]
fn test_last_minute_bet_negligible() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, _, charlie, sniper, _) = setup_test(&env, 1000);

    client.buy_yes(&alice, &2_000_000);
    client.buy_no(&charlie, &4_000_000);

    env.ledger().with_mut(|li| li.timestamp = 950);
    client.buy_yes(&sniper, &2_000_000);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    let sniper_payout = client.claim(&sniper);

    assert_eq!(alice_payout, 5_910_224);
    assert_eq!(sniper_payout, 2_009_775);
}

#[test]
fn test_conservation_check() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, bob, charlie, dave, _) = setup_test(&env, 1000);

    client.buy_yes(&alice, &3_000_000);
    client.buy_no(&dave, &4_000_000);

    env.ledger().with_mut(|li| li.timestamp = 100);
    client.buy_no(&charlie, &2_000_000);

    env.ledger().with_mut(|li| li.timestamp = 750);
    client.buy_yes(&bob, &1_000_000);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    let bob_payout = client.claim(&bob);

    assert_eq!(alice_payout, 8_760_000);
    assert_eq!(bob_payout, 1_120_000);
}

#[test]
fn test_same_user_multiple_times_different_weights() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, bob, _, _, _) = setup_test(&env, 1000);

    client.buy_yes(&alice, &1_000_000);
    client.buy_no(&bob, &2_000_000);

    env.ledger().with_mut(|li| li.timestamp = 500);
    client.buy_yes(&alice, &1_000_000);

    let (alice_yes_info, _) = client.get_position(&alice);
    assert_eq!(alice_yes_info.amount, 2_000_000);
    assert_eq!(alice_yes_info.weighted_amount, 1_250_000);
    
    let state = client.get_state();
    assert_eq!(state.total_bettors, 2);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    assert_eq!(alice_payout, 3_960_000);
}

#[test]
fn test_one_sided_market_with_weights() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, bob, _, _, _) = setup_test(&env, 1000);

    client.buy_yes(&alice, &3_000_000);

    env.ledger().with_mut(|li| li.timestamp = 500);
    client.buy_yes(&bob, &2_000_000);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    let bob_payout = client.claim(&bob);

    assert_eq!(alice_payout, 3_000_000);
    assert_eq!(bob_payout, 2_000_000);
}

#[test]
fn test_single_winner_gets_full_losing_pool() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, oracle, alice, bob, _, _, _) = setup_test(&env, 1000);

    client.buy_no(&bob, &5_000_000);

    env.ledger().with_mut(|li| li.timestamp = 400);
    client.buy_yes(&alice, &1_000_000);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.resolve(&oracle, &Outcome::Yes);

    let alice_payout = client.claim(&alice);
    assert_eq!(alice_payout, 5_900_000);
}

#[test]
fn test_full_lifecycle_no_wins() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, oracle, alice, bob, _, _, _) = setup_test(&env, 1000);
    
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
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, oracle, alice, bob, charlie, _, _) = setup_test(&env, 1000);
    
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
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, _, alice, _, _, _, _) = setup_test(&env, 1000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    let res = client.try_buy_yes(&alice, &2_000_000);
    assert_eq!(res, Err(Ok(MarketError::BettingClosed)));
}

#[test]
fn test_unauthorized_resolve() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, _, _, _, _, _, _) = setup_test(&env, 1000);
    
    env.ledger().with_mut(|li| li.timestamp = 1500);
    
    let fake_oracle = Address::generate(&env);
    let res = client.try_resolve(&fake_oracle, &Outcome::Yes);
    assert_eq!(res, Err(Ok(MarketError::NotOracle)));
}

#[test]
fn test_refund_unresolved() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, _, alice, _, _, _, token_client) = setup_test(&env, 1000);
    
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
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, _, alice, _, _, _, _) = setup_test(&env, 1000);
    
    let res = client.try_buy_yes(&alice, &500_000);
    assert_eq!(res, Err(Ok(MarketError::BelowMinBet)));
}

#[test]
fn test_double_claim() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, oracle, alice, bob, _, _, _) = setup_test(&env, 1000);
    
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
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 500);
    let (client, _, alice, _, _, _, _) = setup_test(&env, 1000);
    
    client.buy_yes(&alice, &2_000_000);
    client.buy_yes(&alice, &2_000_000);
    
    let pos = client.get_position(&alice);
    assert_eq!(pos.0.amount, 4_000_000);
    
    let state = client.get_state();
    assert_eq!(state.total_bettors, 1);
}
