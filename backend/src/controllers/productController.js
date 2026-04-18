import Product from '../models/Product.js';

export const getAllProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { serialNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, serialNumber, retailPrice, wholesalePrice, gstPercentage, stock } = req.body;

    const existingProduct = await Product.findOne({ serialNumber });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this serial number already exists' });
    }

    const product = new Product({
      name,
      serialNumber,
      retailPrice,
      wholesalePrice,
      gstPercentage,
      stock
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, serialNumber, retailPrice, wholesalePrice, gstPercentage, stock } = req.body;

    const existingProduct = await Product.findOne({ serialNumber, _id: { $ne: req.params.id } });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this serial number already exists' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, serialNumber, retailPrice, wholesalePrice, gstPercentage, stock },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};