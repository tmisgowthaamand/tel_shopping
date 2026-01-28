const { DeliveryPartner, Order } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

class DeliveryService {
    /**
     * Find nearby available delivery partners
     */
    async findNearbyPartners(longitude, latitude, radiusKm = config.delivery.radiusKm) {
        try {
            const partners = await DeliveryPartner.findNearby(longitude, latitude, radiusKm);
            return partners;
        } catch (error) {
            logger.error('Error finding nearby partners:', error);
            throw error;
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Assign delivery partner to order
     */
    async assignPartner(orderId) {
        try {
            const order = await Order.findById(orderId).populate('user');

            if (!order) {
                throw new Error('Order not found');
            }

            if (!order.deliveryAddress?.location?.coordinates) {
                throw new Error('Order has no delivery location');
            }

            const [longitude, latitude] = order.deliveryAddress.location.coordinates;

            // Find nearby partners
            const partners = await this.findNearbyPartners(longitude, latitude);

            if (partners.length === 0) {
                logger.warn(`No delivery partners available for order: ${order.orderId}`);
                return null;
            }

            // Sort by distance & rating
            const sortedPartners = partners.map((partner) => {
                const distance = this.calculateDistance(
                    latitude,
                    longitude,
                    partner.currentLocation.coordinates[1],
                    partner.currentLocation.coordinates[0]
                );
                return { partner, distance };
            }).sort((a, b) => {
                // Primary: distance, Secondary: rating
                if (a.distance !== b.distance) {
                    return a.distance - b.distance;
                }
                return b.partner.stats.averageRating - a.partner.stats.averageRating;
            });

            // Broadcast to partners
            for (const { partner, distance } of sortedPartners.slice(0, 5)) {
                const assigned = await this.broadcastToPartner(partner, order, distance);
                if (assigned) {
                    return partner;
                }
            }

            logger.warn(`No partner accepted order: ${order.orderId}`);
            return null;
        } catch (error) {
            logger.error('Error assigning partner:', error);
            throw error;
        }
    }

    /**
     * Broadcast order request to partner via Telegram
     */
    async broadcastToPartner(partner, order, distance) {
        try {
            const eta = Math.ceil(distance * 3); // Rough ETA in minutes (20 km/h)
            const etaTime = new Date(Date.now() + eta * 60 * 1000);
            const etaFormatted = etaTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const earnings = this.calculateDeliveryEarnings(distance);

            const message = `
🛵 *New Delivery Request*

📦 Order: ${order.orderId}
📍 Distance: ${distance.toFixed(2)} km
⏱ ETA: ${etaFormatted}
💵 Earnings: ₹${earnings}

📋 *Items:*
${order.items.map((item) => `  • ${item.productName} x${item.quantity}`).join('\n')}

💰 *Order Value:* ₹${order.total}

📍 *Delivery Address:*
${order.deliveryAddress.address}
      `.trim();

            // This would be called from botService
            // For now, we just log the intent
            logger.info(`Broadcasting order ${order.orderId} to partner ${partner.telegramId}`);

            // Store pending request for partner response
            await this.storePendingRequest(partner._id, order._id);

            return true;
        } catch (error) {
            logger.error('Error broadcasting to partner:', error);
            return false;
        }
    }

    /**
     * Store pending delivery request
     */
    async storePendingRequest(partnerId, orderId) {
        // This would typically use Redis for temporary storage
        // Simplified version
        const partner = await DeliveryPartner.findById(partnerId);
        if (partner) {
            // We'll handle this via callback queries
        }
    }

    /**
     * Partner accepts order
     */
    async acceptOrder(partnerId, orderId) {
        try {
            const partner = await DeliveryPartner.findById(partnerId);
            const order = await Order.findById(orderId);

            if (!partner || !order) {
                throw new Error('Partner or order not found');
            }

            if (order.deliveryPartner) {
                throw new Error('Order already assigned');
            }

            // Assign partner
            order.deliveryPartner = partner._id;
            order.deliveryAssignedAt = new Date();

            // Calculate ETA
            const [longitude, latitude] = order.deliveryAddress.location.coordinates;
            const distance = this.calculateDistance(
                latitude,
                longitude,
                partner.currentLocation.coordinates[1],
                partner.currentLocation.coordinates[0]
            );
            order.calculateETA(distance);

            await order.save();

            // Update partner
            await partner.acceptOrder(order._id);

            logger.info(`Partner ${partner.name} accepted order ${order.orderId}`);

            return { order, partner };
        } catch (error) {
            logger.error('Error accepting order:', error);
            throw error;
        }
    }

    /**
     * Partner rejects order
     */
    async rejectOrder(partnerId, orderId) {
        try {
            logger.info(`Partner ${partnerId} rejected order ${orderId}`);
            // Try next partner
            return await this.assignPartner(orderId);
        } catch (error) {
            logger.error('Error rejecting order:', error);
            throw error;
        }
    }

    /**
     * Update delivery status
     */
    async updateDeliveryStatus(partnerId, orderId, status) {
        try {
            const partner = await DeliveryPartner.findById(partnerId);
            const order = await Order.findById(orderId);

            if (!partner || !order) {
                throw new Error('Partner or order not found');
            }

            if (order.deliveryPartner?.toString() !== partnerId) {
                throw new Error('Partner not assigned to this order');
            }

            await order.updateStatus(status, '', 'partner');

            if (status === 'delivered') {
                const earnings = this.calculateDeliveryEarnings(0); // Would calculate from actual distance
                await partner.completeDelivery(order._id, earnings);
            }

            logger.info(`Delivery status updated: ${order.orderId} -> ${status}`);

            return order;
        } catch (error) {
            logger.error('Error updating delivery status:', error);
            throw error;
        }
    }

    /**
     * Calculate delivery earnings
     */
    calculateDeliveryEarnings(distanceKm) {
        const basePay = 30; // Base pay per delivery
        const perKmRate = 10; // Per km rate
        return Math.round(basePay + distanceKm * perKmRate);
    }

    /**
     * Get Google Maps navigation link
     */
    getNavigationLink(latitude, longitude) {
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }

    /**
     * Update partner location
     */
    async updatePartnerLocation(partnerId, longitude, latitude) {
        try {
            const partner = await DeliveryPartner.findById(partnerId);
            if (!partner) {
                throw new Error('Partner not found');
            }

            await partner.updateLocation(longitude, latitude);

            return partner;
        } catch (error) {
            logger.error('Error updating partner location:', error);
            throw error;
        }
    }

    /**
     * Toggle partner online status
     */
    async toggleOnlineStatus(partnerId, isOnline, longitude = null, latitude = null) {
        try {
            const partner = await DeliveryPartner.findById(partnerId);
            if (!partner) {
                throw new Error('Partner not found');
            }

            if (isOnline) {
                if (!longitude || !latitude) {
                    throw new Error('Location required to go online');
                }
                await partner.goOnline(longitude, latitude);
            } else {
                await partner.goOffline();
            }

            return partner;
        } catch (error) {
            logger.error('Error toggling partner status:', error);
            throw error;
        }
    }
}

module.exports = new DeliveryService();
