#!/usr/bin/env python
"""
Test the fixed location-strict filtering
"""
import sys
sys.path.insert(0, '.')
from app import process_advanced_medical_query

# Test queries - should ONLY show Faridabad hospitals
test_queries = [
    "cost of fever in faridabad",
    "fever cost faridabad",
    "pneumonia treatment cost faridabad",
    "diabetes treatment in faridabad",
    "cancer cost across faridabad",
]

print("=" * 80)
print("TESTING STRICT LOCATION-ONLY FILTERING")
print("=" * 80)

for i, query in enumerate(test_queries, 1):
    print(f"\n{'─' * 80}")
    print(f"Test {i}: {query}")
    print(f"{'─' * 80}")
    response = process_advanced_medical_query(query)
    
    # Check if response contains only Faridabad hospitals
    if "Faridabad" in response and "Pune" not in response and "Ahmedabad" not in response:
        print("✅ PASS - Only Faridabad hospitals shown\n")
    else:
        print("❌ FAIL - Other cities detected\n")
    
    print(response[:600] + "...\n" if len(response) > 600 else response)

print("=" * 80)
print("TEST COMPLETE")
print("=" * 80)
