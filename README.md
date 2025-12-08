import cv2
from flask import Flask, render_template, Response
import pandas as pd
import time

app = Flask(__name__)
data = {'time': [], 'speed': []}

def gen_frames():
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        speed = 0  # احسب السرعة هنا
        if speed > 60:
            print("Alert!")
        data['time'].append(time.time())
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + cv2.imencode('.jpg', frame)[1].tobytes() + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Speed Monitor</title>
</head>
<body>
    <h1>Vehicle Speed Monitor</h1>
    <img src="{{ url_for('video_feed') }}" alt="Video Feed">
</body>
</html>
flask
opencv-python
pandas
