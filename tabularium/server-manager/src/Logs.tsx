// src/components/Logs.tsx
import React from "react";
import { Card, Typography } from "antd";

const { Text } = Typography;

export type Log = {
    type: "INFO" | "WARN" | "ERR";
    message: string;
    time: string;
};

type LogsProps = {
    logs: Log[];
};

const Logs: React.FC<LogsProps> = ({ logs }) => {
    const getColor = (type: Log["type"]) => {
        switch (type) {
            case "ERR":
                return "red";
            case "WARN":
                return "orange";
            case "INFO":
                return "green";
            default:
                return "black";
        }
    };

    return (
        <>
            {logs.map((log, idx) => (
                <Card
                    key={idx}
                    size="small"
                    style={{
                        marginBottom: "8px",
                        borderLeft: `4px solid ${getColor(log.type)}`,
                        backgroundColor: "#f7f7f7",
                    }}
                >
                    <Text type="secondary">{log.time}</Text>{" "}
                    <Text style={{ color: getColor(log.type), fontWeight: 500 }}>
                        [{log.type}]
                    </Text>{" "}
                    <Text>{log.message}</Text>
                </Card>
            ))}
        </>
    );
};

export default Logs;