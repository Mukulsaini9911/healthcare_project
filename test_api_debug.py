#!/usr/bin/env python3
"""Test script to debug API calls"""

import sys
import os

# Add app.py location to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import (
    process_chatbot_query,
    CURRENT_AI_PROVIDER
)

print("=" * 60)
print("API Configuration Check")
print("=" * 60)
print(f"Current AI Provider: {CURRENT_AI_PROVIDER}")
print("=" * 60)

# Test query
test_query = "What is fever?"

print(f"\nTesting with query: '{test_query}'")
print("=" * 60)

result = process_chatbot_query(test_query)

print("=" * 60)
print(f"Result Provider: {result['provider']}")
print(f"Fallback Used: {result['fallback_used']}")
print(f"Provider Errors: {result['provider_errors']}")
print(f"Response (first 200 chars): {result['text'][:200]}...")
print("=" * 60)
