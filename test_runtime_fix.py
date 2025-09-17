#!/usr/bin/env python3

import requests
import json
import os

# Get TMDB API key from environment (you'll need to set this)
api_key = os.environ.get('TMDB_API_KEY')
if not api_key:
    print("Please set TMDB_API_KEY environment variable")
    exit(1)

base_url = 'https://api.themoviedb.org/3/discover/movie'

# Test different runtime scenarios
test_scenarios = [
    {
        'name': 'Under 90 minutes (0-90)',
        'params': {
            'api_key': api_key,
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '0',
            'with_runtime.lte': '90'
        }
    },
    {
        'name': '150+ minutes with 999 max',
        'params': {
            'api_key': api_key,
            'include_adult': 'false',
            'include_video': 'false', 
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '150',
            'with_runtime.lte': '999'
        }
    },
    {
        'name': '150+ minutes without max',
        'params': {
            'api_key': api_key,
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US',
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '150'
            # No with_runtime.lte parameter
        }
    },
    {
        'name': '150+ minutes with realistic max (300)',
        'params': {
            'api_key': api_key,
            'include_adult': 'false',
            'include_video': 'false',
            'language': 'en-US',
            'region': 'US', 
            'page': '1',
            'sort_by': 'popularity.desc',
            'with_runtime.gte': '150',
            'with_runtime.lte': '300'
        }
    }
]

for scenario in test_scenarios:
    print(f"\n=== {scenario['name']} ===")
    
    try:
        response = requests.get(base_url, params=scenario['params'], timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            print(f"Total results: {data.get('total_results', 0)}")
            print(f"Results on this page: {len(results)}")
            
            if results:
                # Show runtime info for first few movies
                print("Sample movies and their runtimes:")
                for i, movie in enumerate(results[:3]):
                    title = movie.get('title', 'Unknown')
                    # Note: runtime is not included in discover results, 
                    # would need separate movie detail API call
                    print(f"  {i+1}. {title}")
                    
        else:
            print(f"Error response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

print("\n=== Analysis ===")
print("If '150+ with 999 max' gives fewer results than '150+ without max',")
print("then 999 is likely being treated as an invalid upper bound.")