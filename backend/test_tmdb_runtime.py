#!/usr/bin/env python3

import requests
import json

# TMDB API endpoint
base_url = 'https://api.themoviedb.org/3/discover/movie'

# Test different runtime scenarios (without actual API key, we'll see the error response structure)
test_scenarios = [
    {
        'name': 'Runtime 90-120 minutes',
        'params': {
            'api_key': 'test_key',  # This will fail but show us the request structure
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '90',
            'with_runtime.lte': '120'
        }
    },
    {
        'name': 'Runtime 150+ minutes (with 999 max)',
        'params': {
            'api_key': 'test_key',
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '150',
            'with_runtime.lte': '999'  # This might be the issue
        }
    },
    {
        'name': 'Runtime 150+ minutes (without max)',
        'params': {
            'api_key': 'test_key',
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '150'
            # No with_runtime.lte parameter
        }
    }
]

for scenario in test_scenarios:
    print(f"\n=== {scenario['name']} ===")
    print(f"Request URL: {base_url}")
    print(f"Parameters: {json.dumps(scenario['params'], indent=2)}")
    
    try:
        response = requests.get(base_url, params=scenario['params'], timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("Expected 401 (Invalid API key) - but URL structure is correct")
        else:
            print(f"Response: {response.text[:200]}...")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

# According to TMDB docs, let's check the expected parameter format
print(f"\n=== TMDB API Parameter Analysis ===")
print("Expected TMDB runtime parameters:")
print("- with_runtime.gte: minimum runtime in minutes")
print("- with_runtime.lte: maximum runtime in minutes") 
print("\nPotential issues:")
print("1. Using 999 as max runtime might be invalid")
print("2. TMDB might have an actual max runtime limit")
print("3. For '150+' scenarios, we might need to omit 'with_runtime.lte' entirely")