# Blender Job Queue System

This application is a Blender addon that can be used within Blender or through automated scripts to import, modify and export 3D assets.

## Features

- Feature 1
- Feature 2
- ...

## Requirements

- [Blender](https://www.blender.org/) (ensure it's installed and accessible in your system PATH)
- Python 3.8+
- Other dependencies listed in `requirements.txt`

## Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/your-org/job-queue-system.git
    cd job-queue-system/apps/blender
    ```

2. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3. Configure environment variables as needed (see `.env.example`).

## Usage

To start processing jobs:
```bash
python main.py
```

## Project Structure

- `logic` - The actual functionality that performs the actions. This can be called as part of a script or from within Blender's GUI using the panels.
- `operators` - The functions themselves that can be called within Blender.
- `panels` - UI tool that allows the features to be used from within Blender's GUI.

## Contributing

Contributions are welcome! Please open issues or submit pull requests.

## License

This project is licensed under the MIT License.