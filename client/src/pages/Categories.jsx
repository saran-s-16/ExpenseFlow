import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Edit3,
    Trash2,
    FolderTree,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../services/categoryService";
import { formatCurrency, getCategoryIcon } from "../utils/formatters";
import "../styles/categories.css";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState("expense");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentCatId, setCurrentCatId] = useState(null);
    const [catName, setCatName] = useState("");
    const [catType, setCatType] = useState("expense");
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getCategories();
            if (res.success) {
                setCategories(res.categories || []);
            }
        } catch (err) {
            console.error("Failed to load categories:", err);
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to retrieve categories"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleOpenCreate = () => {
        setModalMode("create");
        setCurrentCatId(null);
        setCatName("");
        setCatType(activeTab);
        setModalError("");
        setShowModal(true);
    };

    const handleOpenEdit = (cat) => {
        setModalMode("edit");
        setCurrentCatId(cat.id);
        setCatName(cat.name);
        setCatType(cat.type);
        setModalError("");
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError("");

        if (!catName.trim()) {
            setModalError("Category name is required");
            return;
        }

        try {
            setModalLoading(true);
            if (modalMode === "create") {
                await createCategory({ name: catName.trim(), type: catType });
            } else {
                await updateCategory(currentCatId, {
                    name: catName.trim(),
                    type: catType,
                });
            }
            setShowModal(false);
            loadCategories();
        } catch (err) {
            setModalError(
                err.response?.data?.message ||
                err.message ||
                "Failed to save category"
            );
        } finally {
            setModalLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            setDeleteError("");
            await deleteCategory(deleteTarget.id);
            setDeleteTarget(null);
            loadCategories();
        } catch (err) {
            setDeleteError(
                err.response?.data?.message ||
                err.message ||
                "Failed to delete category"
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    const filtered = categories.filter((c) => c.type === activeTab);
    const expenseCount = categories.filter((c) => c.type === "expense").length;
    const incomeCount = categories.filter((c) => c.type === "income").length;

    return (
        <div className="categories-page">
            <div className="cat-header-strip">
                <div>
                    <h2 className="page-title">Categories</h2>
                    <p className="page-subtitle">
                        Organize your transactions into customized financial categories
                    </p>
                </div>
                <button className="add-tx-btn" onClick={handleOpenCreate}>
                    <Plus size={16} />
                    <span>New Category</span>
                </button>
            </div>

            {/* Type Tabs */}
            <div className="cat-tabs-bar">
                <button
                    className={`cat-tab-btn ${
                        activeTab === "expense" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("expense")}
                >
                    <ArrowUpRight size={17} />
                    <span>Expense Categories ({expenseCount})</span>
                </button>
                <button
                    className={`cat-tab-btn ${
                        activeTab === "income" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("income")}
                >
                    <ArrowDownLeft size={17} />
                    <span>Income Categories ({incomeCount})</span>
                </button>
            </div>

            {error && (
                <div className="glass-card" style={{ padding: "20px", color: "#c45e5e" }}>
                    {error}
                </div>
            )}

            {/* Category Cards Grid */}
            <div className="categories-grid">
                {loading ? (
                    <div className="glass-card cat-empty-card">
                        Loading categories...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card cat-empty-card">
                        <FolderTree size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                        <h3>No {activeTab} categories found</h3>
                        <p>Create custom categories to organize your financial flow.</p>
                        <button className="add-tx-btn" onClick={handleOpenCreate}>
                            <Plus size={16} />
                            <span>Add {activeTab} Category</span>
                        </button>
                    </div>
                ) : (
                    filtered.map((cat) => (
                        <div className="glass-card cat-card" key={cat.id}>
                            <div className="cat-card-header">
                                <div className="cat-avatar-circle">
                                    {getCategoryIcon(cat.name)}
                                </div>
                                <div className="cat-card-actions">
                                    <button
                                        className="action-icon-btn"
                                        title="Edit category"
                                        onClick={() => handleOpenEdit(cat)}
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        className="action-icon-btn delete"
                                        title="Delete category"
                                        onClick={() => {
                                            setDeleteTarget(cat);
                                            setDeleteError("");
                                        }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="cat-card-body">
                                <h3>{cat.name}</h3>
                                <span className={`cat-type-pill pill-${cat.type}`}>
                                    {cat.type}
                                </span>
                            </div>

                            <div className="cat-card-footer">
                                <div className="cat-stat">
                                    <span>Transactions</span>
                                    <strong>{cat.transactionCount}</strong>
                                </div>
                                <div className="cat-stat" style={{ textAlign: "right" }}>
                                    <span>Total Recorded</span>
                                    <strong>{formatCurrency(cat.totalSpent)}</strong>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "420px" }}>
                        <div className="modal-header">
                            <h3>
                                {modalMode === "create"
                                    ? "Create Category"
                                    : "Edit Category"}
                            </h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && (
                            <div className="modal-error-alert">{modalError}</div>
                        )}

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="type-toggle-group">
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${
                                        catType === "expense" ? "active-expense" : ""
                                    }`}
                                    onClick={() => setCatType("expense")}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={`type-toggle-btn ${
                                        catType === "income" ? "active-income" : ""
                                    }`}
                                    onClick={() => setCatType("income")}
                                >
                                    Income
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Groceries, Gym, Investments"
                                    className="form-input"
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={modalLoading}
                                >
                                    {modalLoading
                                        ? "Saving..."
                                        : modalMode === "create"
                                        ? "Create Category"
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "420px" }}>
                        <div className="modal-header">
                            <h3>Delete Category?</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setDeleteTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {deleteError ? (
                            <div className="modal-error-alert">{deleteError}</div>
                        ) : (
                            <p
                                style={{
                                    color: "var(--text-secondary, #666)",
                                    margin: "16px 0",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                }}
                            >
                                Are you sure you want to delete the category{" "}
                                <strong>"{deleteTarget.name}"</strong>? Categories with active
                                transactions cannot be deleted.
                            </p>
                        )}

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                {deleteError ? "Close" : "Cancel"}
                            </button>
                            {!deleteError && (
                                <button
                                    type="button"
                                    className="btn-delete-confirm"
                                    onClick={handleConfirmDelete}
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? "Deleting..." : "Delete Category"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
