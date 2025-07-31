import {
  Button,
  TextField,
  Slider,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { createClient } from "@supabase/supabase-js";
import "react-toastify/dist/ReactToastify.css";

// Load from .env
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const BUCKET_NAME = process.env.REACT_APP_SUPABASE_BUCKET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function VideoAnnotator() {
  const videoRef = useRef();
  const [videoURL, setVideoURL] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [currentLabel, setCurrentLabel] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setVideoURL(url);
    setAnnotations([]);
    setCurrentLabel("");
  };

  const handleLabelChange = (e) => {
    setCurrentLabel(e.target.value);
  };

  const saveLabel = () => {
    const frame = Math.floor(videoRef.current.currentTime * 30); // Assuming 30fps
    setAnnotations((prev) => {
      const exists = prev.find((item) => item.frame === frame);
      if (exists) {
        return prev.map((item) =>
          item.frame === frame ? { frame, label: currentLabel } : item
        );
      }
      return [...prev, { frame, label: currentLabel }];
    });
    toast.success(`Đã lưu nhãn tại frame ${frame}`);
  };

  const handleSeek = (value) => {
    const time = value / 30;
    videoRef.current.currentTime = time;
    setCurrentFrame(value);
  };

const handleExport = async () => {
  const json = JSON.stringify(annotations, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const supabaseFilename = `annotations-${Date.now()}.json`;

  // Save locally
const localUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = localUrl;
  a.download = "output.json"; 
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(localUrl);

  // Upload to Supabase
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(supabaseFilename, blob, {
      contentType: "application/json",
      upsert: false,
    });

  if (error) {
    toast.error("Lỗi Supabase: " + error.message);
  } else {
    toast.success("Đã lưu lên Supabase thành công!");
  }
};

  return (
    <Stack spacing={3}>
      <Button variant="contained" component="label">
        Tải Video
        <input type="file" accept="video/*" hidden onChange={handleFileUpload} />
      </Button>

      {videoURL && (
        <>
          <video
            ref={videoRef}
            src={videoURL}
            width="100%"
            controls
            onTimeUpdate={() =>
              setCurrentFrame(Math.floor(videoRef.current.currentTime * 30))
            }
          />

          <Typography variant="h6">Frame hiện tại: {currentFrame}</Typography>

          <Slider
            min={0}
            max={Math.floor(videoRef.current?.duration * 30 || 300)}
            value={currentFrame}
            onChange={(e, val) => handleSeek(val)}
          />

          <TextField
            label="Gán nhãn cho frame"
            value={currentLabel}
            onChange={handleLabelChange}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={saveLabel}>
              Lưu nhãn
            </Button>
            <Button variant="contained" onClick={handleExport}>
              Xuất + Lưu lên Supabase
            </Button>
          </Stack>

          {annotations.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="h6">Danh sách nhãn đã lưu</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Frame</strong></TableCell>
                      <TableCell><strong>Nhãn</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {annotations
                      .sort((a, b) => a.frame - b.frame)
                      .map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.frame}</TableCell>
                          <TableCell>{item.label}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}