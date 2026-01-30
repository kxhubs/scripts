import argparse
import json
import os
import requests
from datetime import datetime


def get_latest_release(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


def filter_assets(assets, keyword=None):
    if keyword:
        matching = [a for a in assets if keyword.lower() in a['name'].lower()]
        if not matching:
            raise ValueError(f"No assets matching keyword '{keyword}'")
        if len(matching) > 1:
            print(f"Warning: Multiple assets match '{keyword}', taking the first one.")
        return matching[0]
    else:
        if len(assets) == 0:
            raise ValueError("No assets in the release")
        if len(assets) == 1:
            return assets[0]
        # If multiple and no keyword, select the one with the latest updated_at
        sorted_assets = sorted(assets, key=lambda a: datetime.fromisoformat(a['updated_at'].rstrip('Z')), reverse=True)
        selected = sorted_assets[0]
        print(f"Multiple assets found, selecting the latest by updated_at: {selected['name']}")
        return selected


def load_metadata(download_dir):
    metadata_path = os.path.join(download_dir, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            return json.load(f)
    return {}


def save_metadata(download_dir, metadata):
    metadata_path = os.path.join(download_dir, "metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)


def download_asset(asset, download_dir):
    url = asset['browser_download_url']
    filename = asset['name']
    local_path = os.path.join(download_dir, filename)

    response = requests.get(url, stream=True)
    response.raise_for_status()

    with open(local_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"Downloaded {filename} to {download_dir}")
    return filename


def process_repo(owner, repo, keyword, download_dir, metadata):
    repo_key = f"{owner}/{repo}"

    release = get_latest_release(owner, repo)
    latest_tag = release['tag_name']

    assets = release['assets']
    asset = filter_assets(assets, keyword)

    should_download = True
    old_filename = None

    if repo_key in metadata:
        if metadata[repo_key]['tag'] == latest_tag:
            should_download = False
            print(f"Skipping {repo_key}: Already up to date with {latest_tag}")
        else:
            old_filename = metadata[repo_key].get('asset_name')

    if should_download:
        if old_filename and os.path.exists(os.path.join(download_dir, old_filename)):
            os.remove(os.path.join(download_dir, old_filename))
            print(f"Deleted old asset: {old_filename}")

        new_filename = download_asset(asset, download_dir)

        metadata[repo_key] = {
            'tag': latest_tag,
            'asset_name': new_filename
        }
        save_metadata(download_dir, metadata)


def main():
    parser = argparse.ArgumentParser(description="Download latest release assets from multiple GitHub repositories.")
    parser.add_argument('--download_dir', required=True, help="Directory to download assets to")
    parser.add_argument('--repos', nargs='+', required=True,
                        help="List of repositories in format owner/repo?keyword (keyword optional)")

    args = parser.parse_args()

    os.makedirs(args.download_dir, exist_ok=True)
    metadata = load_metadata(args.download_dir)

    for repo_str in args.repos:
        parts = repo_str.split('?')
        owner_repo = parts[0]
        keyword = parts[1] if len(parts) > 1 else None

        owner, repo = owner_repo.split('/')

        try:
            process_repo(owner, repo, keyword, args.download_dir, metadata)
        except Exception as e:
            print(f"Error processing {owner}/{repo}: {e}")


if __name__ == "__main__":
    main()