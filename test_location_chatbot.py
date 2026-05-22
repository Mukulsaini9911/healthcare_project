#!/usr/bin/env python
"""
Test script to verify location-based disease cost chatbot queries
"""
import sys
sys.path.insert(0, '.')
from app import process_advanced_medical_query

# Test queries with location
test_queries = [
    "cost of fever in faridabad",
    "fever cost faridabad",
    "pneumonia treatment cost in faridabad",
    "what is the cost of dengue in faridabad",
    "cheapest hospital for fever treatment faridabad",
    "diabetes cost in delhi",
    "cancer treatment cost in mumbai",
    "asthma treatment price faridabad",
]

print("=" * 80)
print("TESTING LOCATION-BASED CHATBOT QUERIES")
print("=" * 80)

for i, query in enumerate(test_queries, 1):
    print(f"\n{'─' * 80}")
    print(f"Test {i}: {query}")
    print(f"{'─' * 80}")
    response = process_advanced_medical_query(query)
    print(response)
    print()

print("=" * 80)
print("TEST COMPLETE")
print("=" * 80)
