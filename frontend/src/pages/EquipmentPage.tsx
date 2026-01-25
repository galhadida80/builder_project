import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import { mockEquipment } from '../mocks/data'
import StatusBadge from '../components/common/StatusBadge'
import type { Equipment } from '../types'

const categories = ['Heavy Machinery', 'Lifting Equipment', 'Power Equipment', 'Safety Equipment', 'Tools']

export default function EquipmentPage() {
  const { projectId } = useParams()
  const [search, setSearch] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const projectEquipment = mockEquipment.filter(e => e.projectId === projectId)
  const filteredEquipment = projectEquipment.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.equipmentCode?.toLowerCase().includes(search.toLowerCase())
  )

  const handleViewDetails = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedEquipment(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Equipment</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Equipment
        </Button>
      </Box>

      <TextField
        placeholder="Search equipment..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: 300 }}
        size="small"
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
        }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEquipment.map((equipment) => (
                <TableRow key={equipment.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewDetails(equipment)}>
                  <TableCell><Chip label={equipment.equipmentCode} size="small" /></TableCell>
                  <TableCell><Typography fontWeight="medium">{equipment.name}</Typography></TableCell>
                  <TableCell>{equipment.category}</TableCell>
                  <TableCell>{equipment.manufacturer}</TableCell>
                  <TableCell>{equipment.location}</TableCell>
                  <TableCell><StatusBadge status={equipment.status} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetails(equipment); }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredEquipment.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No equipment found</Typography>
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: 480 } }}>
        {selectedEquipment && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Equipment Details</Typography>
              <IconButton onClick={handleCloseDrawer}><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Chip label={selectedEquipment.equipmentCode} size="small" sx={{ mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">{selectedEquipment.name}</Typography>
              <StatusBadge status={selectedEquipment.status} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <Box><Typography variant="caption" color="text.secondary">Category</Typography><Typography>{selectedEquipment.category}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Manufacturer</Typography><Typography>{selectedEquipment.manufacturer}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Model</Typography><Typography>{selectedEquipment.model}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Serial Number</Typography><Typography>{selectedEquipment.serialNumber}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Location</Typography><Typography>{selectedEquipment.location}</Typography></Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Documents</Typography>
            <List dense>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Technical Specifications" secondary="PDF - 2.4 MB" /></ListItem>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Safety Certificate" secondary="PDF - 1.1 MB" /></ListItem>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Installation Manual" secondary="PDF - 5.8 MB" /></ListItem>
            </List>
            <Button size="small" startIcon={<AddIcon />}>Add Document</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Approval Timeline</Typography>
            <List dense>
              <ListItem><ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon><ListItemText primary="Submitted by Moshe Levy" secondary="Feb 5, 2024" /></ListItem>
              <ListItem><ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon><ListItemText primary="Approved by Sarah Mizrahi" secondary="Feb 8, 2024" /></ListItem>
              <ListItem><ListItemIcon><CheckCircleIcon color="warning" /></ListItemIcon><ListItemText primary="Pending - Inspector Review" secondary="Waiting" /></ListItem>
            </List>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedEquipment.status === 'draft' && (
                <Button variant="contained" startIcon={<SendIcon />} fullWidth>Submit for Approval</Button>
              )}
              <Button variant="outlined" fullWidth>Edit Equipment</Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Equipment</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Equipment Name" margin="normal" required />
          <TextField fullWidth label="Equipment Code" margin="normal" />
          <TextField fullWidth select label="Category" margin="normal">
            {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Manufacturer" margin="normal" />
          <TextField fullWidth label="Model" margin="normal" />
          <TextField fullWidth label="Serial Number" margin="normal" />
          <TextField fullWidth label="Location" margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>Add Equipment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
