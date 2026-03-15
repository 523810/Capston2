const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    required: true 
  },
  totalPages: { 
    type: Number, 
    required: true 
  },
  pdfFileUrl: { 
    type: String, 
    required: true // S3에 올린 고전문학 PDF 주소가 들어갈 곳!
  }
});

module.exports = mongoose.model('Book', bookSchema);