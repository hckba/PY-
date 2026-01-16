# 內有API
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)

# 設定資料庫 (SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 定義資料表模型
class HealthRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))      # 'diet' 或 'exercise'
    date = db.Column(db.String(50))      # YYYY-MM-DD
    time = db.Column(db.String(50))
    name = db.Column(db.String(100))     # 食物或運動名稱
    calories = db.Column(db.Float)
    protein = db.Column(db.Float, default=0)
    fat = db.Column(db.Float, default=0)
    carbs = db.Column(db.Float, default=0)
    duration = db.Column(db.Integer, default=0) # 運動時長

# 建立資料庫 database.db
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

# API: 取得所有記錄
@app.route('/api/records', methods=['GET'])# API: 取得所有記錄
def get_records():
    records = HealthRecord.query.all()
    output = []
    for r in records:
        output.append({
            '__backendId': r.id,
            'type': r.type,
            'date': r.date,
            'time': r.time,
            'food_name': r.name if r.type == 'diet' else None,
            'exercise_name': r.name if r.type == 'exercise' else None,
            'calories': r.calories,
            'protein': r.protein,
            'fat': r.fat,
            'carbs': r.carbs,
            'duration': r.duration
        })
    return jsonify(output)

# API: 新增記錄
@app.route('/api/records', methods=['POST'])# API: 新增記錄
def add_record():
    data = request.json
    new_rec = HealthRecord(
        type=data['type'],
        date=data['date'],
        time=data['time'],
        name=data.get('food_name') or data.get('exercise_name'),
        calories=data['calories'],
        protein=data.get('protein', 0),
        fat=data.get('fat', 0),
        carbs=data.get('carbs', 0),
        duration=data.get('duration', 0)
    )
    db.session.add(new_rec)
    db.session.commit()
    return jsonify({'isOk': True, 'id': new_rec.id})

# API: 刪除記錄
@app.route('/api/records/<int:record_id>', methods=['DELETE'])# API: 刪除記錄
def delete_record(record_id):
    record = HealthRecord.query.get(record_id)
    if record:
        db.session.delete(record)
        db.session.commit()
        return jsonify({'isOk': True})
    return jsonify({'isOk': False}), 404

if __name__ == '__main__':
    app.run(debug=True)