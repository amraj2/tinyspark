from app import create_app


app = create_app()


if __name__ == "__main__":
    # Dev server
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="127.0.0.1", port=port)
