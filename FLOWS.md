# Coherence Protocol Request Flows

This document outlines the request flows required to observe each state for each coherence protocol. 
The flows assume a "cold" start where no core has the cache line for the given address (ADDR).
ADDR can be any valid address (e.g., 0).

## Format
`C<ID>-<ACTION>-<ADDRESS>`
- **ID**: Core ID (e.g., 0, 1)
- **ACTION**: **R** (Read) or **W** (Write)
- **ADDRESS**: Memory Address (e.g., 0)

## 1. MSI Protocol
### **Modified (M)**
1. `C0-W-0`

### **Shared (S)**
1. `C0-R-0`

### **Invalid (I)**
1. `C0-R-0`
2. `C1-W-0`  *(C0 becomes Invalid)*

---

## 2. MESI Protocol
### **Modified (M)**
1. `C0-W-0`

### **Exclusive (E)**
1. `C0-R-0`

### **Shared (S)**
1. `C0-R-0`
2. `C1-R-0`

### **Invalid (I)**
1. `C0-R-0`
2. `C1-W-0`

---

## 3. MOSI Protocol
### **Modified (M)**
1. `C0-W-0`

### **Owner (O)**
1. `C0-W-0`
2. `C1-R-0`  *(C0 becomes Owner)*

### **Shared (S)**
1. `C0-R-0`

### **Invalid (I)**
1. `C0-R-0`
2. `C1-W-0`

---

## 4. MOESI Protocol
### **Modified (M)**
1. `C0-W-0`

### **Owner (O)**
1. `C0-W-0`
2. `C1-R-0`  *(C0 becomes Owner)*

### **Exclusive (E)**
1. `C0-R-0`

### **Shared (S)**
1. `C0-R-0`
2. `C1-R-0`

### **Invalid (I)**
1. `C0-R-0`
2. `C1-W-0`
